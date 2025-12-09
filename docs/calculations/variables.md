# Supply Chain Variables

Complete specification of all INPUT and OUTPUT variables for the warehouse/retail model.

---

## INPUT Variables

### INPUT_OMZET

**Type**: INPUT
**Category**: BEDRIJF
**Unit**: euro per jaar
**Description**: Annual revenue/turnover

**Used By**:
- OUTPUT_VOORRAAD_ABSOLUUT
- [Add other dependent variables]

**Business Logic**: Primary business metric that drives inventory calculations

---

### INPUT_SKUS

**Type**: INPUT
**Category**: BEDRIJF
**Unit**: aantal artikelen
**Description**: Number of unique stock-keeping units (SKUs)

**Used By**:
- [Add dependent variables]

**Business Logic**: Determines inventory complexity and storage requirements

---

### INPUT_WEKEN_VOORRAAD

**Type**: INPUT
**Category**: VOORRAAD
**Unit**: weken
**Description**: Number of weeks of inventory to maintain

**Used By**:
- OUTPUT_VOORRAAD_ABSOLUUT

**Business Logic**: Inventory policy parameter that affects working capital

---

### [ADD MORE INPUT VARIABLES]

Template for each additional INPUT variable:
- Variable name (UPPERCASE_SNAKE_CASE)
- Category
- Unit
- Description
- Dependencies
- Business logic

---

## OUTPUT Variables

### OUTPUT_VOORRAAD_ABSOLUUT

**Type**: OUTPUT
**Category**: VOORRAAD
**Unit**: euro
**Description**: Absolute inventory value based on weekly turnover and weeks of inventory

**Formula**:
```
(INPUT_OMZET / 52) * INPUT_WEKEN_VOORRAAD
```

**Dependencies**:
- INPUT_OMZET
- INPUT_WEKEN_VOORRAAD

**Used By**:
- [Add variables that use this output]

**Business Logic**: Calculates required inventory investment based on weekly revenue and inventory policy

---

### [ADD MORE OUTPUT VARIABLES]

Template for each additional OUTPUT variable:
- Variable name (UPPERCASE_SNAKE_CASE)
- Category
- Unit
- Description
- Formula (using INPUT_*, OUTPUT_*, PARAM_* references)
- Dependencies
- Variables that use this output
- Business logic

---

## Instructions

1. Fill in all INPUT variables your model needs
2. Define all OUTPUT variables with their formulas
3. Ensure formulas only use valid syntax (see README.md)
4. Document dependencies to enable proper calculation order
5. Test that formulas produce expected results
