import ProjectCredentialsClient from './ProjectCredentialsClient';

// Static export requires generateStaticParams for dynamic routes
export async function generateStaticParams() {
  // Return at least one static path to satisfy the export requirement
  return [
    { id: 'placeholder' }
  ];
}

export default function ProjectCredentials() {
  return <ProjectCredentialsClient />;
}
