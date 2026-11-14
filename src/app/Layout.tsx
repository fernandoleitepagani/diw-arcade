import { Suspense, useEffect, useRef } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { PixelIcon } from "../components/pixel/PixelIcon/PixelIcon";
import { ThemeToggle } from "../components/pixel/ThemeToggle/ThemeToggle";
import { PageSkeleton } from "../components/ui";
import { Hud } from "../features/hud/Hud";
import { AvatarMenu } from "./AvatarMenu";
import { ReviewIcon, StatsIcon, TreeIcon } from "./NavIcons";
import "./Layout.css";

const NAV_LINKS = [
  { to: "/hoje", label: "Hoje", Icon: ReviewIcon, also: undefined },
  { to: "/trilha", label: "Trilha", Icon: TreeIcon, also: "/no/" },
  { to: "/progresso", label: "Progresso", Icon: StatsIcon, also: undefined },
];

/** A node and its sub-routes live on the Trilha, as in the prototype. */
function isActive(
  pathname: string,
  to: string,
  also: string | undefined,
): boolean {
  return (
    pathname === to ||
    pathname.startsWith(`${to}/`) ||
    (also !== undefined && pathname.startsWith(also))
  );
}

export function Layout() {
  const mainRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    mainRef.current?.focus();
  }, [pathname]);

  return (
    <div className="shell">
      <a className="shell__skip" href="#conteudo">
        Pular para o conteúdo
      </a>

      <header className="shell__header">
        <div className="shell__header-in">
          <NavLink className="shell__brand" to="/?inicio">
            <PixelIcon name="prompt" scale={3} />
            DIW Arcade
          </NavLink>

          <nav className="shell__nav" aria-label="Principal">
            {NAV_LINKS.map(({ to, label, Icon, also }) => {
              const active = isActive(pathname, to, also);
              return (
                <Link
                  key={to}
                  className={active ? "shell__link active" : "shell__link"}
                  to={to}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="shell__cursor">
                    <PixelIcon name="cursor" />
                  </span>
                  <span className="shell__icon">
                    <Icon />
                  </span>
                  <span className="shell__label">{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="shell__stat">
            <Hud />
            <ThemeToggle />
            <AvatarMenu />
          </div>
        </div>
      </header>

      <main
        className="l-container shell__main"
        id="conteudo"
        ref={mainRef}
        tabIndex={-1}
      >
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
