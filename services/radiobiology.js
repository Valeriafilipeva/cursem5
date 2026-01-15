export const calculateBED = (d, n, alphaBeta) => n * d * (1 + d / alphaBeta);
export const calculateEQD2 = (bed, alphaBeta) => bed / (1 + 2 / alphaBeta);
