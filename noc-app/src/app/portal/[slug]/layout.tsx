import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Portal do cliente - R.TEC Solucoes Tecnologicas',
  description: 'Portal institucional e de relatorios para clientes R.TEC',
};

export default function PortalLayout(props: {
  children: React.ReactNode;
}) {
  return <>{props.children}</>;
}
