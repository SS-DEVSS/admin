import { ReactNode } from "react";

type LoginProps = {
  children: ReactNode;
  logo?: ReactNode;
};

const CredentialsLayout = ({ children, logo }: LoginProps) => {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#002858] p-4 sm:p-6">
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        {logo}
        <div className="w-full rounded-2xl bg-white p-8 shadow-2xl sm:p-10">
          {children}
        </div>
      </div>
    </div>
  );
};

export default CredentialsLayout;
