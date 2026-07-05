{ pkgs }: {
  deps = [
    pkgs.go
    pkgs.nodejs_20
    pkgs.bun
    pkgs.sqlite
    pkgs.git
    pkgs.cacert
  ];
}
