export const isValidInput = (dose, fractions, alphaBeta) => {
  return (
    dose > 0 &&
    fractions > 0 &&
    alphaBeta > 0
  );
};
