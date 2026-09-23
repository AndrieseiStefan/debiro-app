export const viewports = {
  desktop: {width: 1448, height: 1086},
  tablet: {width: 1024, height: 768},
  mobile: {width: 375, height: 812}
} as const;

export const boundaryViewports = [
  {width: 1200, height: 800},
  {width: 1199, height: 800},
  {width: 768, height: 900},
  {width: 767, height: 900}
] as const;

export const regressionViewports = [
  {width: 950, height: 833},
  {width: 320, height: 700}
] as const;

export const headerBoundaryViewports = [
  {width: 864, height: 800},
  {width: 863, height: 800}
] as const;
