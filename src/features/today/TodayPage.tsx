import { usePageTitle } from '../../app/usePageTitle';

export function TodayPage() {
  usePageTitle('Hoje');

  return (
    <section className="page">
      <h1>Hoje</h1>
    </section>
  );
}
