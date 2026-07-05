{ pkgs }: {
  deps = [
    pkgs.go
    pkgs.nodejs_20
    pkgs.bun
    pkgs.postgresql
    pkgs.git
    pkgs.cacert
  ];
}
