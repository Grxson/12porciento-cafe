export interface PricingInputs {
  costPerKg: number;
  gramsPerUnit: number;
  roastingCostPerUnit: number;
  packagingCostPerUnit: number;
  overheadFixed: number;
  marginRetailPct: number;
  marginB2bPct: number;
}

export interface PricingResult {
  rawCostPerUnit: number;
  totalCostPerUnit: number;
  suggestedRetailPrice: number;
  suggestedB2bPrice: number;
  retailMarginAmount: number;
  b2bMarginAmount: number;
}

export function calculatePrices(inputs: PricingInputs): PricingResult {
  const {
    costPerKg,
    gramsPerUnit,
    roastingCostPerUnit,
    packagingCostPerUnit,
    overheadFixed,
    marginRetailPct,
    marginB2bPct,
  } = inputs;

  // 15% roasting yield loss: 250g bag needs ~294g raw beans
  const roastYieldFactor = 1 / 0.85;
  const rawKgNeeded = (gramsPerUnit / 1000) * roastYieldFactor;
  const rawCostPerUnit = rawKgNeeded * costPerKg;
  const totalCostPerUnit =
    rawCostPerUnit + roastingCostPerUnit + packagingCostPerUnit + overheadFixed;

  const suggestedRetailPrice = totalCostPerUnit / (1 - marginRetailPct / 100);
  const suggestedB2bPrice = totalCostPerUnit / (1 - marginB2bPct / 100);

  const round = (n: number) => Math.round(n * 100) / 100;

  return {
    rawCostPerUnit: round(rawCostPerUnit),
    totalCostPerUnit: round(totalCostPerUnit),
    suggestedRetailPrice: round(suggestedRetailPrice),
    suggestedB2bPrice: round(suggestedB2bPrice),
    retailMarginAmount: round(suggestedRetailPrice - totalCostPerUnit),
    b2bMarginAmount: round(suggestedB2bPrice - totalCostPerUnit),
  };
}
