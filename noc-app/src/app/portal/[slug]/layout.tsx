import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Portal do Cliente — R.TEC Soluções Tecnológicas',
  description: 'Portal institucional e de relatórios para clientes R.TEC',
};

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
