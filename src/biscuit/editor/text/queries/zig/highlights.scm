; Keywords
[
  "const"
  "var"
  "pub"
  "extern"
  "export"
  "comptime"
  "inline"
  "noinline"
  "threadlocal"
  "allowzero"
  "volatile"
  "linksection"
  "addrspace"
  "align"
  "packed"
] @keyword

"fn" @keyword.function

"return" @keyword.return

[
  "if"
  "else"
  "switch"
] @keyword.conditional

[
  "while"
  "for"
] @keyword.repeat

[
  "try"
  "catch"
  "error"
] @keyword.exception

[
  "struct"
  "enum"
  "union"
  "opaque"
] @keyword.type

[
  "and"
  "or"
  "orelse"
] @keyword.operator

[
  "true"
  "false"
] @boolean

"null" @constant.builtin
"undefined" @constant.builtin
"unreachable" @constant.builtin

; Types (PascalCase identifiers)
(BuildinTypeExpr) @type.builtin

; Functions
(FnProto (IDENTIFIER) @function)

; Builtins
(BUILTINIDENTIFIER) @function.builtin

; Strings
(STRINGLITERALSINGLE) @string

; Numbers
(INTEGER) @number

; Identifiers
(IDENTIFIER) @variable

; Operators
[
  "+"
  "-"
  "*"
  "/"
  "%"
  "="
  "=="
  "!="
  "<"
  ">"
  "<="
  ">="
  "!"
  "++"
  "<<"
  ">>"
  "."
] @operator

; Punctuation
[
  ";"
  ":"
  ","
] @punctuation.delimiter

[
  "("
  ")"
  "{"
  "}"
  "["
  "]"
] @punctuation.bracket

"@" @punctuation.special
