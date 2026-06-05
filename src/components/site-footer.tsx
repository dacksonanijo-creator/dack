import { useI18n } from "@/lib/i18n";

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-border/50 bg-card/30">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div>
          <div className="font-display text-lg font-bold">Taskora</div>
          <p className="mt-2 text-sm text-muted-foreground">{t("footer.tagline")}</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold">{t("footer.product")}</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><a href="/#how" className="hover:text-foreground">{t("nav.howItWorks")}</a></li>
            <li><a href="/#users" className="hover:text-foreground">{t("nav.users")}</a></li>
            <li><a href="/#companies" className="hover:text-foreground">{t("nav.companies")}</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">{t("footer.legal")}</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>Termos</li>
            <li>Privacidade</li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">{t("footer.contact")}</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>hello@taskora.app</li>
            <li>Maputo, Moçambique</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/50 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Taskora. {t("footer.rights")}
      </div>
    </footer>
  );
}
