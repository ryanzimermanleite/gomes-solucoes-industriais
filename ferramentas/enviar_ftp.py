"""Envia o site pronto (publicar/site) para a hospedagem por FTP.

Uso: dois cliques em ferramentas/enviar_ftp.bat
     (ele monta o pacote com preparar_publicacao.py e depois chama este script)
     python ferramentas/enviar_ftp.py --simular   mostra o que seria enviado, sem conectar

- Pede servidor, usuário e senha na hora. A senha não aparece na tela e não fica salva em lugar nenhum.
- Tenta primeiro a conexão criptografada (FTPS). Só usa FTP comum se você confirmar.
- Mostra a pasta de destino e pede confirmação antes de enviar.
- Só envia e substitui arquivos. Não apaga nada no servidor.
"""
import ftplib
import getpass
import posixpath
import ssl
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from preparar_publicacao import DOMINIO, SITE  # noqa: E402

TEMPO_LIMITE = 60


class FTPS(ftplib.FTP_TLS):
    """FTPS que reaproveita a sessão criptografada na transferência (alguns servidores exigem)."""

    def ntransfercmd(self, cmd, rest=None):
        conexao, tamanho = ftplib.FTP.ntransfercmd(self, cmd, rest)
        if self._prot_p:
            conexao = self.context.wrap_socket(conexao, server_hostname=self.host, session=self.sock.session)
        return conexao, tamanho


def perguntar(texto: str, padrao: str = "") -> str:
    extra = f" [{padrao}]" if padrao else ""
    resposta = input(f"{texto}{extra}: ").strip()
    return resposta or padrao


def confirmar(texto: str, padrao: bool = True) -> bool:
    resposta = input(f"{texto} ({'S/n' if padrao else 's/N'}): ").strip().lower()
    if not resposta:
        return padrao
    return resposta in ("s", "sim", "y", "yes")


def parar(mensagem: str) -> None:
    print(f"\n{mensagem}")
    sys.exit(1)


def separar_servidor(texto: str) -> tuple[str, int]:
    """Aceita '1.2.3.4', 'ftp://1.2.3.4', 'ftp.dominio.com:21' e devolve (servidor, porta)."""
    texto = texto.strip()
    if texto.lower().startswith("sftp://"):
        parar("Este script usa FTP/FTPS (porta 21). Para SFTP, use o FileZilla (ver publicar/COMO_PUBLICAR.txt).")
    for prefixo in ("ftp://", "ftps://"):
        if texto.lower().startswith(prefixo):
            texto = texto[len(prefixo):]
    texto = texto.split("/")[0]
    if texto.count(":") == 1:
        servidor, porta = texto.split(":")
        return servidor, int(porta)
    return texto, 21


def arquivos_do_site() -> list[Path]:
    """Todos os arquivos do pacote, com o index.html da raiz por último (o site só muda quando tudo já chegou)."""
    arquivos = [p for p in SITE.rglob("*") if p.is_file()]
    return sorted(arquivos, key=lambda p: (p == SITE / "index.html", p.relative_to(SITE).as_posix()))


def pastas_do_site(arquivos: list[Path]) -> list[str]:
    """Todas as subpastas, de cima para baixo, para criar as de cima antes das de dentro."""
    pastas = set()
    for p in arquivos:
        partes = p.relative_to(SITE).parts[:-1]
        for i in range(1, len(partes) + 1):
            pastas.add("/".join(partes[:i]))
    return sorted(pastas, key=lambda s: (s.count("/"), s))


def conectar(servidor: str, porta: int, usuario: str, senha: str) -> ftplib.FTP:
    print(f"\nConectando em {servidor}:{porta}...")
    ftp = FTPS(timeout=TEMPO_LIMITE)
    try:
        ftp.connect(servidor, porta)
    except OSError as erro:
        parar(f"Não consegui falar com o servidor ({erro}). Confira o endereço e a internet.")
    try:
        ftp.auth()
        criptografado = True
    except (ftplib.Error, ssl.SSLError, OSError) as erro:
        print(f"O servidor não aceitou conexão criptografada ({erro}).")
        if not confirmar("Continuar com FTP comum? A senha vai pela internet sem criptografia", padrao=False):
            parar("Nada foi enviado.")
        ftp.close()
        ftp = ftplib.FTP(timeout=TEMPO_LIMITE)
        ftp.connect(servidor, porta)
        criptografado = False
    try:
        ftp.login(usuario, senha)
    except ftplib.error_perm as erro:
        parar(f"O servidor recusou o login ({erro}). Confira usuário e senha. Nada foi enviado.")
    if criptografado:
        ftp.prot_p()
        print("Conectado com criptografia (FTPS).")
    else:
        print("Conectado sem criptografia (FTP comum).")
    return ftp


def listar(ftp: ftplib.FTP, pasta: str = "") -> list[str]:
    try:
        nomes = ftp.nlst(pasta) if pasta else ftp.nlst()
    except ftplib.error_perm:
        return []  # pasta vazia: alguns servidores respondem com erro
    nomes = (posixpath.basename(n.rstrip("/")) for n in nomes)
    return sorted(n for n in nomes if n not in (".", ".."))


def existe_pasta(ftp: ftplib.FTP, pasta: str) -> bool:
    atual = ftp.pwd()
    try:
        ftp.cwd(pasta)
        return True
    except ftplib.error_perm:
        return False
    finally:
        ftp.cwd(atual)


def escolher_pasta(ftp: ftplib.FTP) -> str:
    inicio = ftp.pwd()
    print(f"\nPasta inicial deste usuário de FTP: {inicio}")
    print("O que tem nela:", ", ".join(listar(ftp)) or "(vazia)")

    sugestao = inicio
    for candidata in (f"domains/{DOMINIO}/public_html", "public_html"):
        if existe_pasta(ftp, candidata):
            sugestao = posixpath.join(inicio, candidata)
            break

    print(f"\nO site precisa ir para a pasta pública do domínio {DOMINIO}.")
    print("Aperte Enter para aceitar a sugestão entre colchetes, ou digite outra pasta.")
    pasta = perguntar("Pasta de destino", sugestao)
    try:
        ftp.cwd(pasta)
    except ftplib.error_perm as erro:
        parar(f"Não consegui abrir a pasta {pasta} ({erro}). Nada foi enviado.")
    return ftp.pwd()


def conferir_destino(ftp: ftplib.FTP, pasta: str, arquivos: list[Path]) -> None:
    hoje = listar(ftp)
    print(f"\nHoje em {pasta}:", ", ".join(hoje) or "(vazia)")
    if "wp-config.php" in hoje:
        print("ATENÇÃO: esta pasta tem um WordPress. O site novo vai ficar por cima dele.")
        if not confirmar("Tem certeza de que é esta a pasta?", padrao=False):
            parar("Nada foi enviado.")
    if {"default.php", "index.php"} & set(hoje):
        print("Obs.: o index.html novo tem prioridade sobre default.php/index.php (o .htaccess garante isso).")
    total = sum(p.stat().st_size for p in arquivos)
    print(f"\nVou enviar {len(arquivos)} arquivos ({total / 1e6:.1f} MB) para {pasta}.")
    print("Arquivos com o mesmo nome serão substituídos. Nada será apagado.")
    if not confirmar("Enviar agora?"):
        parar("Nada foi enviado.")


def tamanho_no_servidor(ftp: ftplib.FTP, nome: str) -> int | None:
    """Tamanho do arquivo no servidor, ou None se o servidor não informa (aí não dá para conferir)."""
    try:
        return ftp.size(nome)
    except ftplib.error_perm:
        return None


def enviar(ftp: ftplib.FTP, arquivos: list[Path]) -> list[str]:
    for pasta in pastas_do_site(arquivos):
        try:
            ftp.mkd(pasta)
        except ftplib.error_perm:
            pass  # já existe

    falhas = []
    for i, p in enumerate(arquivos, 1):
        nome = p.relative_to(SITE).as_posix()
        print(f"[{i:3}/{len(arquivos)}] {nome}")
        try:
            with open(p, "rb") as f:
                ftp.storbinary(f"STOR {nome}", f)
            if tamanho_no_servidor(ftp, nome) not in (None, p.stat().st_size):
                falhas.append(f"{nome} (chegou com tamanho diferente)")
        except (ftplib.Error, OSError) as erro:
            falhas.append(f"{nome} ({erro})")
            try:
                ftp.voidcmd("NOOP")
            except (ftplib.Error, OSError):
                restantes = [q.relative_to(SITE).as_posix() for q in arquivos[i:]]
                falhas.extend(f"{n} (conexão caiu antes)" for n in restantes)
                break
    return falhas


def simular() -> None:
    arquivos = arquivos_do_site()
    total = sum(p.stat().st_size for p in arquivos)
    print(f"Simulação: nada é enviado. Domínio: {DOMINIO}")
    print(f"{len(pastas_do_site(arquivos))} pastas e {len(arquivos)} arquivos ({total / 1e6:.1f} MB).")
    print("Primeiros:", ", ".join(p.relative_to(SITE).as_posix() for p in arquivos[:3]))
    print("Último:   ", arquivos[-1].relative_to(SITE).as_posix())


def main() -> None:
    if not (SITE / "index.html").exists():
        parar("Não achei publicar/site. Rode antes ferramentas/preparar_publicacao.bat.")
    if "--simular" in sys.argv:
        simular()
        return

    print(f"ENVIAR O SITE DA GOMES PARA {DOMINIO}")
    print("Os dados ficam só nesta janela: nada é salvo.\n")
    servidor, porta = separar_servidor(perguntar("Servidor FTP (ex.: ftp://1.2.3.4)"))
    if not servidor:
        parar("Servidor em branco. Nada foi enviado.")
    usuario = perguntar("Usuário do FTP")
    senha = getpass.getpass("Senha do FTP (não aparece enquanto digita; para colar, botão direito): ")

    ftp = conectar(servidor, porta, usuario, senha)
    del senha
    try:
        pasta = escolher_pasta(ftp)
        arquivos = arquivos_do_site()
        conferir_destino(ftp, pasta, arquivos)
        falhas = enviar(ftp, arquivos)
    finally:
        try:
            ftp.quit()
        except (ftplib.Error, OSError):
            ftp.close()

    if falhas:
        print(f"\n{len(falhas)} arquivo(s) não foram enviados direito:")
        for f in falhas:
            print("  -", f)
        parar("Rode de novo: ele envia tudo outra vez por cima.")
    print(f"\nPronto: {len(arquivos)} arquivos enviados para {pasta}.")
    print(f"Falta ligar o domínio {DOMINIO} a este site no painel da hospedagem (ver publicar/COMO_PUBLICAR.txt).")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        parar("Cancelado. Nada mais foi enviado.")
