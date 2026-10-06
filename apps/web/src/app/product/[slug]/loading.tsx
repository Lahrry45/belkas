export default function Loading() {
  return (
    <div className="container-x py-10">
      <div className="grid gap-8 md:grid-cols-[1.2fr_1fr] md:gap-14">
        <div className="skeleton aspect-square" />
        <div className="space-y-4">
          <div className="skeleton h-3 w-20" />
          <div className="skeleton h-12 w-3/4" />
          <div className="skeleton h-6 w-28" />
          <div className="skeleton h-20 w-full" />
          <div className="skeleton h-12 w-full" />
        </div>
      </div>
    </div>
  );
}
