export function AppFooter() {
  return (
    <footer className="border-t bg-muted/30 px-4 py-3 md:px-6 mt-auto">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-1 text-xs text-muted-foreground">
        <span>© 2026 iPSC-Flow · iPSC生产管理系统 v1.0</span>
        <span className="text-muted-foreground/60">
          GMP Compliant
        </span>
      </div>
    </footer>
  )
}
