use tauri::command;

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug, PartialEq)]
pub struct MemoryUsage {
    pub resident_bytes: u64,
    pub formatted: String,
    pub peak_bytes: Option<u64>,
    pub peak_formatted: Option<String>,
}

pub fn format_bytes(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = 1024 * KB;
    const GB: u64 = 1024 * MB;

    if bytes >= GB {
        format!("{:.1} GB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.1} MB", bytes as f64 / MB as f64)
    } else if bytes >= KB {
        format!("{:.1} KB", bytes as f64 / KB as f64)
    } else {
        format!("{} B", bytes)
    }
}

pub fn get_process_memory() -> MemoryUsage {
    #[cfg(target_os = "windows")]
    {
        #[repr(C)]
        #[allow(non_snake_case)]
        struct PROCESS_MEMORY_COUNTERS {
            cb: u32,
            PageFaultCount: u32,
            PeakWorkingSetSize: usize,
            WorkingSetSize: usize,
            QuotaPeakPagedPoolUsage: usize,
            QuotaPagedPoolUsage: usize,
            QuotaPeakNonPagedPoolUsage: usize,
            QuotaNonPagedPoolUsage: usize,
            PagefileUsage: usize,
            PeakPagefileUsage: usize,
        }

        extern "system" {
            fn GetCurrentProcess() -> *mut std::ffi::c_void;
            fn K32GetProcessMemoryInfo(
                process: *mut std::ffi::c_void,
                ppsmc: *mut PROCESS_MEMORY_COUNTERS,
                cb: u32,
            ) -> i32;
        }

        unsafe {
            let mut pmc = std::mem::zeroed::<PROCESS_MEMORY_COUNTERS>();
            pmc.cb = std::mem::size_of::<PROCESS_MEMORY_COUNTERS>() as u32;
            let process = GetCurrentProcess();
            if K32GetProcessMemoryInfo(process, &mut pmc, pmc.cb) != 0 {
                let resident = pmc.WorkingSetSize as u64;
                let peak = pmc.PeakWorkingSetSize as u64;
                return MemoryUsage {
                    resident_bytes: resident,
                    formatted: format_bytes(resident),
                    peak_bytes: Some(peak),
                    peak_formatted: Some(format_bytes(peak)),
                };
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        if let Ok(content) = std::fs::read_to_string("/proc/self/status") {
            let mut resident: Option<u64> = None;
            let mut peak: Option<u64> = None;
            for line in content.lines() {
                if line.starts_with("VmRSS:") {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if parts.len() >= 2 {
                        if let Ok(kb) = parts[1].parse::<u64>() {
                            resident = Some(kb * 1024);
                        }
                    }
                } else if line.starts_with("VmPeak:") {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if parts.len() >= 2 {
                        if let Ok(kb) = parts[1].parse::<u64>() {
                            peak = Some(kb * 1024);
                        }
                    }
                }
            }
            if let Some(res) = resident {
                return MemoryUsage {
                    resident_bytes: res,
                    formatted: format_bytes(res),
                    peak_bytes: peak,
                    peak_formatted: peak.map(format_bytes),
                };
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        #[repr(C)]
        struct MachTaskBasicInfo {
            virtual_size: u64,
            resident_size: u64,
            resident_size_max: u64,
            user_time: [u32; 2],
            system_time: [u32; 2],
            policy: i32,
            suspend_count: i32,
        }

        extern "C" {
            fn mach_task_self() -> u32;
            fn task_info(
                target_task: u32,
                flavor: u32,
                task_info_out: *mut MachTaskBasicInfo,
                task_info_outCnt: *mut u32,
            ) -> i32;
        }

        const MACH_TASK_BASIC_INFO: u32 = 20;

        unsafe {
            let mut info = std::mem::zeroed::<MachTaskBasicInfo>();
            let mut count = (std::mem::size_of::<MachTaskBasicInfo>() / std::mem::size_of::<u32>()) as u32;
            if task_info(mach_task_self(), MACH_TASK_BASIC_INFO, &mut info, &mut count) == 0 {
                let resident = info.resident_size;
                let peak = info.resident_size_max;
                return MemoryUsage {
                    resident_bytes: resident,
                    formatted: format_bytes(resident),
                    peak_bytes: Some(peak),
                    peak_formatted: Some(format_bytes(peak)),
                };
            }
        }
    }

    // Fallback if OS memory query fails
    MemoryUsage {
        resident_bytes: 0,
        formatted: "0 MB".into(),
        peak_bytes: None,
        peak_formatted: None,
    }
}

#[command]
pub fn get_memory_usage() -> Result<MemoryUsage, String> {
    Ok(get_process_memory())
}

#[cfg(test)]
pub mod tests {
    use super::*;

    #[test]
    fn test_format_bytes() {
        assert_eq!(format_bytes(500), "500 B");
        assert_eq!(format_bytes(1024), "1.0 KB");
        assert_eq!(format_bytes(1024 * 1024 * 5), "5.0 MB");
        assert_eq!(format_bytes(1024 * 1024 * 1024 * 2), "2.0 GB");
    }

    #[test]
    fn test_get_memory_usage() {
        let mem = get_process_memory();
        // On modern Windows, macOS, or Linux runners, memory should be non-zero
        #[cfg(any(target_os = "windows", target_os = "linux", target_os = "macos"))]
        {
            assert!(mem.resident_bytes > 0);
            assert!(!mem.formatted.is_empty());
        }
    }
}
