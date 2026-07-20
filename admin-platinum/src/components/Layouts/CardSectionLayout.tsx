import { ReactNode } from "react";

type CardSectionLayoutProps = {
  children: ReactNode;
};

const CardSectionLayout = ({ children }: CardSectionLayoutProps) => {
  return (
    <main className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {children}
    </main>
  );
};

export default CardSectionLayout;
