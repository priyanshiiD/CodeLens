export default function PageHeader({ title, description, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
      <div>
        <h1 className="text-2xl font-semibold text-cl-text tracking-tight">{title}</h1>
        {description && <p className="text-cl-text-secondary text-sm mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}
