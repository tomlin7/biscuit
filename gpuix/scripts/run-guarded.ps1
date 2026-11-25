param([Parameter(Mandatory=$true)][string]$Executable, [string[]]$Arguments=@(), [int]$TimeoutSeconds=240, [int]$MemoryMB=3072, [int]$MaxProcesses=12)
$ErrorActionPreference='Stop'
Add-Type -TypeDefinition @"
using System;
using System.Text;
using System.Runtime.InteropServices;
using System.Threading;
public static class HiroshiGuard {
 [StructLayout(LayoutKind.Sequential)] struct Basic { public long processTime,jobTime; public uint flags; public UIntPtr min,max; public uint count; public UIntPtr affinity; public uint priority,scheduling; }
 [StructLayout(LayoutKind.Sequential)] struct IO { public ulong a,b,c,d,e,f; }
 [StructLayout(LayoutKind.Sequential)] struct Limits { public Basic basic; public IO io; public UIntPtr processMemory,jobMemory,peakProcess,peakJob; }
 [StructLayout(LayoutKind.Sequential)] struct Security { public int size; public IntPtr descriptor; [MarshalAs(UnmanagedType.Bool)] public bool inherit; }
 [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)] struct Startup { public int size; public string reserved,desktop,title; public int x,y,w,h,cx,cy,fill,flags; public short show,cb; public IntPtr reserved2,input,output,error; }
 [StructLayout(LayoutKind.Sequential)] struct ProcessInfo { public IntPtr process,thread; public uint pid,tid; }
 [StructLayout(LayoutKind.Sequential)] struct Memory { public uint size,load; public ulong total,available,pageTotal,pageAvailable,virtualTotal,virtualAvailable,extended; }
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode)] static extern IntPtr CreateJobObjectW(IntPtr a,string n);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool SetInformationJobObject(IntPtr j,int c,ref Limits l,uint s);
 [DllImport("kernel32.dll")] static extern bool QueryInformationJobObject(IntPtr j,int c,ref Limits l,uint s,IntPtr r);
 [DllImport("kernel32.dll")] static extern bool AssignProcessToJobObject(IntPtr j,IntPtr p);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool CreateProcessW(string app,StringBuilder cmd,IntPtr a,IntPtr b,bool inherit,uint flags,IntPtr env,string cwd,ref Startup s,out ProcessInfo p);
 [DllImport("kernel32.dll")] static extern uint ResumeThread(IntPtr t);
 [DllImport("kernel32.dll")] static extern uint WaitForSingleObject(IntPtr h,uint ms);
 [DllImport("kernel32.dll")] static extern bool GetExitCodeProcess(IntPtr p,out uint code);
 [DllImport("kernel32.dll")] static extern bool TerminateJobObject(IntPtr j,uint code);
 [DllImport("kernel32.dll")] static extern bool TerminateProcess(IntPtr p,uint code);
 [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr h);
 [DllImport("kernel32.dll")] static extern bool GlobalMemoryStatusEx(ref Memory m);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern IntPtr CreateFileW(string n,uint access,uint share,ref Security security,uint create,uint flags,IntPtr template);
 static string Quote(string s) { string result="\""; int slashes=0; foreach(char c in s) { if(c=='\\') slashes++; else if(c=='"') { result+=new string('\\',slashes*2+1)+"\""; slashes=0; } else { result+=new string('\\',slashes)+c; slashes=0; } } return result+new string('\\',slashes*2)+"\""; }

 public static int Run(string exe,string[] args,string log,int timeout,int mb,int processes) {
  IntPtr job=CreateJobObjectW(IntPtr.Zero,null), file=IntPtr.Zero,input=IntPtr.Zero; ProcessInfo child=new ProcessInfo();
  try {
   Limits limit=new Limits(); limit.basic.flags=0x2000|0x200|0x8; limit.basic.count=(uint)processes; limit.jobMemory=(UIntPtr)((ulong)mb*1024*1024);
   if(job==IntPtr.Zero||!SetInformationJobObject(job,9,ref limit,(uint)Marshal.SizeOf(limit))) throw new Exception("Cannot install process/RAM limits");
   Memory memory=new Memory(); memory.size=(uint)Marshal.SizeOf(memory); GlobalMemoryStatusEx(ref memory);
   ulong floor=Math.Max(4UL*1024*1024*1024,memory.total/6);
   if(memory.available<floor+1024UL*1024*1024) throw new Exception("Insufficient free RAM to start safely");
   Security security=new Security(); security.size=Marshal.SizeOf(security); security.inherit=true;
   file=CreateFileW(log,0x40000000,3,ref security,2,128,IntPtr.Zero); input=CreateFileW("NUL",0x80000000,3,ref security,3,128,IntPtr.Zero);
   if(file.ToInt64()==-1||input.ToInt64()==-1) throw new Exception("Cannot open guarded process log");
   Startup startup=new Startup(); startup.size=Marshal.SizeOf(startup); startup.flags=0x100; startup.input=input; startup.output=file; startup.error=file;
   StringBuilder command=new StringBuilder(Quote(exe)); foreach(string arg in args) command.Append(" ").Append(Quote(arg));
   if(!CreateProcessW(exe,command,IntPtr.Zero,IntPtr.Zero,true,0x08000004,IntPtr.Zero,Environment.CurrentDirectory,ref startup,out child)) throw new Exception("Cannot create suspended process: "+Marshal.GetLastWin32Error());
   if(!AssignProcessToJobObject(job,child.process)) { TerminateProcess(child.process,125); throw new Exception("Cannot contain process; launch cancelled"); }
   ResumeThread(child.thread); DateTime start=DateTime.UtcNow,next=start; ulong peak=0;
   while(WaitForSingleObject(child.process,500)==258) {
    GlobalMemoryStatusEx(ref memory); QueryInformationJobObject(job,9,ref limit,(uint)Marshal.SizeOf(limit),IntPtr.Zero); peak=Math.Max(peak,limit.peakJob.ToUInt64());
    if(DateTime.UtcNow>=next) { Console.WriteLine("RAM guard: tree peak {0} MB, system free {1} MB",peak/1048576,memory.available/1048576); next=DateTime.UtcNow.AddSeconds(10); }
    if(memory.available<floor||DateTime.UtcNow-start>TimeSpan.FromSeconds(timeout)) { TerminateJobObject(job,124); throw new Exception("Guard stopped test: free RAM floor or timeout reached"); }
   }
   QueryInformationJobObject(job,9,ref limit,(uint)Marshal.SizeOf(limit),IntPtr.Zero);
   Console.WriteLine("RAM guard: final tree peak {0} MB; process cap {1}; RAM cap {2} MB",limit.peakJob.ToUInt64()/1048576,processes,mb);
   uint code; GetExitCodeProcess(child.process,out code); return (int)code;
  } finally { if(job!=IntPtr.Zero) { TerminateJobObject(job,125); CloseHandle(job); } if(child.process!=IntPtr.Zero) CloseHandle(child.process); if(child.thread!=IntPtr.Zero) CloseHandle(child.thread); if(file!=IntPtr.Zero) CloseHandle(file); if(input!=IntPtr.Zero) CloseHandle(input); }
 }
}
"@
$logDirectory=Join-Path $PSScriptRoot '../tmp'
New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null
$runLog=Join-Path $logDirectory ('guard-'+[Guid]::NewGuid().ToString('N')+'.log')
try { $result=[HiroshiGuard]::Run($Executable,$Arguments,$runLog,$TimeoutSeconds,$MemoryMB,$MaxProcesses) }
finally { if(Test-Path -LiteralPath $runLog) { Get-Content -LiteralPath $runLog -Tail 20 }; Write-Output "Full log: $runLog" }
if($result -ne 0) { throw "Guarded command exited $result" }
