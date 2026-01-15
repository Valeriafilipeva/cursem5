export const calculateBED = (n, d, alphaBeta) => {
  return n * d * (1 + d / alphaBeta);
};

export const calculateEQD2 = (bed, alphaBeta) => {
  return bed / (1 + 2 / alphaBeta);
};
