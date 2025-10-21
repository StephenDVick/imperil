export const randomInRange = (min, max) => {
  return min + Math.random() * (max - min);
};

export const randomIntInclusive = (min, max) => {
  return Math.floor(randomInRange(0, 1) * (max - min + 1)) + min;
};
