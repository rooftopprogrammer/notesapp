import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Temple Vows & Visits Tracker',
  description: 'Track your temple vows and visits with detailed planning and review features',
};

export default function TemplesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}
