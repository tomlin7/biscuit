; Keywords
"return" @keyword.return

[
  "goto"
  "in"
  "local"
] @keyword

"function" @keyword.function

[
  "if"
  "elseif"
  "else"
  "then"
] @keyword.conditional

[
  "for"
  "while"
  "repeat"
  "until"
  "do"
] @keyword.repeat

"end" @keyword

[
  "and"
  "not"
  "or"
] @keyword.operator

(break_statement) @keyword

(true) @boolean
(false) @boolean

(nil) @constant.builtin

; Comments
(comment) @comment

; Strings
(string) @string

; Numbers
(number) @number

; Operators
[
  "+"
  "-"
  "*"
  "/"
  "%"
  "^"
  "#"
  "=="
  "~="
  "<="
  ">="
  "<"
  ">"
  "="
  ".."
] @operator

; Punctuation
[
  ";"
  ":"
  ","
  "."
] @punctuation.delimiter

[
  "("
  ")"
  "{"
  "}"
  "["
  "]"
] @punctuation.bracket

; Functions
(function_declaration name: (identifier) @function)
(function_call name: (identifier) @function.call)

; Variables / identifiers
(identifier) @variable

; Parameters
(parameters (identifier) @variable.parameter)
