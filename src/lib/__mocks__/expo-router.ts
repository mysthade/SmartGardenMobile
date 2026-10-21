export const router = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
};

export const Link = ({ children }: { children: React.ReactNode }) => children;
