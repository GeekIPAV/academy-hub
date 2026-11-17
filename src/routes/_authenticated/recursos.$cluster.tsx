import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/recursos/$cluster")({
  beforeLoad: ({ params, location }) => {
    const cluster = params.cluster.replace("formacao-de-formadores", "formacao-de-educadores");
    if (cluster === params.cluster) return;

    throw redirect({
      href: location.href.replace(params.cluster, cluster),
      replace: true,
      statusCode: 301,
    });
  },
  component: () => <Outlet />,
});
