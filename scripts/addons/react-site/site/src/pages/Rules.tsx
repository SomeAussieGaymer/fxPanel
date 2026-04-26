import { PageHeader } from "../components/PageHeader";
import { Rules } from "../components/Rules";

export function RulesPage() {
  return (
    <>
      <PageHeader
        title="Server"
        highlight="Rules"
        description="Please read and follow all rules to ensure a great experience for everyone."
      />
      <Rules />
    </>
  );
}
