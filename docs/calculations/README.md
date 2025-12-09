# Supply Chain Calculation Specifications

This directory contains the specifications for all calculation variables, formulas, and dependencies in the Supply Chain Scenario Simulator.

## Purpose

Define all INPUT variables, OUTPUT variables, PARAMETERS, and their relationships to ensure the calculation engine produces accurate results.

## File Structure

- `variables.md` - Complete list of all INPUT and OUTPUT variables with formulas
- `parameters.md` - Global parameters used across calculations
- `formulas.md` - Detailed formula explanations and dependencies
- `examples.md` - Example calculations with expected results

## How to Use

1. Document all variables in `variables.md` following the template below
2. Define formulas using the supported syntax (see Formula Language)
3. Update the seed script (`prisma/seed.ts`) to match these specifications
4. Test calculations end-to-end to validate formulas

## Formula Language

Supported operators: `+`, `-`, `*`, `/`, `(`, `)`

Supported functions:
- `MAX(a, b)` - Maximum of two values
- `MIN(a, b)` - Minimum of two values
- `IF(condition, true_value, false_value)` - Conditional logic
- `ABS(value)` - Absolute value
- `SQRT(value)` - Square root
- `ROUND(value)` - Round to nearest integer
- `CEILING(value)` - Round up
- `FLOOR(value)` - Round down
- `POW(base, exponent)` - Power/exponentiation

Variable references:
- `INPUT_*` - Input variables (user-defined values)
- `OUTPUT_*` - Calculated variables (formula-based)
- `PARAM_*` - Global parameters

## Variable Template

```markdown
### [VARIABLE_NAME]

**Type**: INPUT | OUTPUT
**Category**: BEDRIJF | VOORRAAD | CAPACITEIT | OPSLAGZONE | NETWERK | LOGISTIEK
**Unit**: stuks | euro | m2 | percentage | etc.
**Description**: Clear explanation of what this variable represents

**Formula** (OUTPUT only):
```
[formula using INPUT_*, OUTPUT_*, PARAM_* references]
```

**Dependencies**: List of variables this formula depends on
**Used By**: List of variables that depend on this one

**Business Logic**: Explanation of why this calculation matters
```

## Next Steps

1. Fill in `variables.md` with your complete variable list
2. Document formulas and dependencies
3. Update seed script to match
4. Test calculations
