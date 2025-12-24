export interface AdminAnnouncement {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export async function getAnnouncements(): Promise<AdminAnnouncement[]> {
  return [
    {
      id: 1,
      title: 'Welcome to Admin Dashboard',
      content: 'This is a sample announcement.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true
    }
  ];
}
