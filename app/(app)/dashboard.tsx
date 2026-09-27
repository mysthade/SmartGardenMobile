import { Redirect } from 'expo-router';

/** Redirect legacy /dashboard path to the new (tabs) dashboard */
export default function DashboardRoute() {
  return <Redirect href={'/(app)/(tabs)' as any} />;
}
