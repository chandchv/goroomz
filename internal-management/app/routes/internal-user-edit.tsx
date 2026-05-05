import { redirect } from 'react-router';
import type { Route } from './+types/internal-user-edit';

export function loader({ params }: Route.LoaderArgs) {
  return redirect(`/internal-users/${params.userId}`);
}

export default function InternalUserEditRedirect() {
  return null;
}
