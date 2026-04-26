import { PageHeader } from "../components/PageHeader";
import { Staff } from "../components/Staff";

export function StaffPage() {
  return (
    <>
      <PageHeader
        title="Our"
        highlight="Team"
        description="Dedicated staff available around the clock to keep the community running."
      />
      <Staff />
    </>
  );
}
