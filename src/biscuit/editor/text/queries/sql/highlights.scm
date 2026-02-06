; Keywords
[
  (keyword_select)
  (keyword_from)
  (keyword_where)
  (keyword_and)
  (keyword_as)
  (keyword_asc)
  (keyword_by)
  (keyword_case)
  (keyword_create)
  (keyword_default)
  (keyword_delete)
  (keyword_distinct)
  (keyword_else)
  (keyword_end)
  (keyword_group)
  (keyword_having)
  (keyword_insert)
  (keyword_into)
  (keyword_join)
  (keyword_key)
  (keyword_left)
  (keyword_like)
  (keyword_limit)
  (keyword_on)
  (keyword_order)
  (keyword_primary)
  (keyword_set)
  (keyword_table)
  (keyword_then)
  (keyword_update)
  (keyword_values)
  (keyword_when)
] @keyword

; Data types
[
  (keyword_int)
  (keyword_varchar)
  (keyword_boolean)
] @type

; Literals
(literal) @string

; Identifiers
(identifier) @variable
(field (identifier) @property)

; Functions
(invocation (object_reference (identifier) @function.call))

; Operators
[
  "="
  "<>"
  "<"
  ">"
  "<="
  ">="
  "+"
  "-"
  "*"
  "/"
] @operator

; Punctuation
[
  ";"
  ","
  "."
] @punctuation.delimiter

[
  "("
  ")"
] @punctuation.bracket

; Comments
(comment) @comment
(marginalia) @comment
