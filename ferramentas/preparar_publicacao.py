"""Monta a pasta de publicação do site para o domínio definitivo.

Uso (na pasta do site):  python ferramentas/preparar_publicacao.py
   ou dois cliques em:   ferramentas/preparar_publicacao.bat
   (ferramentas/enviar_ftp.bat roda este script e depois envia o resultado por FTP)

Gera, sem alterar os arquivos originais (a prévia do GitHub continua escondida do Google):
  publicar/site/             -> o que vai para a pasta do domínio no servidor (public_html)
  publicar/<domínio>.zip     -> o mesmo conteúdo em zip, para enviar pelo gerenciador de arquivos
  publicar/COMO_PUBLICAR.txt -> passo a passo

Ajustes feitos só na cópia:
  - tira a marca "noindex" que impede o Google de indexar a prévia;
  - coloca o endereço definitivo no canonical, no og:url, na imagem de compartilhamento e nos dados do Google;
  - cria robots.txt, sitemap.xml e .htaccess (cache, compressão e endereços do site antigo).
Depois de qualquer mudança no site, rode de novo e suba o conteúdo novo.
"""
import re
import shutil
import sys
import zipfile
from datetime import date
from pathlib import Path

# Por enquanto o site fica no domínio antigo. Quando o cliente comprar o domínio novo,
# trocar para "gomeseng.eng.br", rodar de novo e enviar o conteúdo novo.
DOMINIO = "enggomes.com"
URL = f"https://{DOMINIO}/"

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "publicar"
SITE = SAIDA / "site"
ZIP = SAIDA / f"{DOMINIO}.zip"
IGNORAR = shutil.ignore_patterns("Thumbs.db", "desktop.ini", ".DS_Store")


def trocar(html: str, antigo: str, novo: str, nome: str, regex: bool = False) -> str:
    """Substitui exatamente uma ocorrência; para tudo se não achar (o index mudou e o script precisa de ajuste)."""
    if regex:
        resultado, n = re.subn(antigo, lambda _m: novo, html)
    else:
        n = html.count(antigo)
        resultado = html.replace(antigo, novo)
    if n != 1:
        sys.exit(f"ERRO: ajuste '{nome}' encontrou {n} ocorrências no index.html (esperava 1). Nada foi publicado.")
    return resultado


def ajustar_index(html: str) -> str:
    nl = "\r\n" if "\r\n" in html else "\n"
    html = trocar(html,
                  r'[ \t]*<!-- Prévia temporária[^\n]*-->\r?\n[ \t]*<meta name="robots" content="noindex, nofollow">',
                  f'  <link rel="canonical" href="{URL}">',
                  "tirar noindex", regex=True)
    html = trocar(html, '<meta property="og:type" content="website">',
                  f'<meta property="og:type" content="website">{nl}  <meta property="og:url" content="{URL}">',
                  "og:url")
    html = trocar(html, '<meta property="og:image" content="assets/img/og.jpg">',
                  f'<meta property="og:image" content="{URL}assets/img/og.jpg">{nl}'
                  f'  <meta property="og:image:width" content="1200">{nl}'
                  f'  <meta property="og:image:height" content="630">',
                  "og:image")
    html = trocar(html, '"name": "Gomes Soluções Industriais",',
                  f'"name": "Gomes Soluções Industriais",{nl}'
                  f'    "url": "{URL}",{nl}'
                  f'    "image": "{URL}assets/img/og.jpg",{nl}'
                  f'    "logo": "{URL}assets/img/marca/simbolo.png",',
                  "dados do Google")
    if "noindex" in html:
        sys.exit("ERRO: ainda sobrou 'noindex' no index.html. Nada foi publicado.")
    return html


ROBOTS = f"""User-agent: *
Allow: /

Sitemap: {URL}sitemap.xml
"""

SITEMAP = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>{URL}</loc>
    <lastmod>{date.today().isoformat()}</lastmod>
  </url>
</urlset>
"""

# Páginas do site antigo (feito no Construtor de Sites da Hostinger) que o Google ainda mostra.
# Cada uma passa a abrir a seção certa do site novo, em vez de dar "página não encontrada".
PAGINAS_ANTIGAS = {
    "contact": "contato",
    "portifolio": "projetos",
    "reforma-dos-vestiarios-tenda-atacado-em-guarapiranga-sp": "projetos",
    "pintura-e-criacao-de-logo-hotel-oyo-em-jacutinga-mg": "projetos",
    "pintura-de-fachada-e-construcao-de-logo-hotel-oyo-em-piracicaba-sp": "projetos",
    "desenvolvimento-de-logo-hotel-oyo-em-sao-carlos-sp": "projetos",
    "pintura-de-brise-hotel-park-tower-em-campinas-sp": "projetos",
    "limpeza-de-telhas-e-estruturas-metalicas-tenda-atacado": "projetos",
}
REDIRECIONAMENTOS = "\n".join(
    f"  RewriteRule ^{antiga}/?$ /#{secao} [R=301,L,NE]"  # os nomes só têm letras, números e hífen
    for antiga, secao in PAGINAS_ANTIGAS.items()
)

HTACCESS = f"""# Site da Gomes (estático: só HTML, CSS, JS e imagens)
DirectoryIndex index.html

# Endereços do site antigo levados para a seção certa do site novo
<IfModule mod_rewrite.c>
  RewriteEngine On
{REDIRECIONAMENTOS}
</IfModule>

# Cache no navegador: a página sempre atualizada; estilos, scripts e imagens guardados por um tempo
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/html "access plus 0 seconds"
  ExpiresByType text/css "access plus 7 days"
  ExpiresByType application/javascript "access plus 7 days"
  ExpiresByType text/javascript "access plus 7 days"
  ExpiresByType image/webp "access plus 30 days"
  ExpiresByType image/jpeg "access plus 30 days"
  ExpiresByType image/png "access plus 30 days"
  ExpiresByType image/svg+xml "access plus 30 days"
</IfModule>

# Compressão do texto (deixa o site mais leve no 4G)
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css text/plain text/xml application/xml application/javascript text/javascript image/svg+xml
</IfModule>
"""

INSTRUCOES = f"""COMO PUBLICAR O SITE EM {DOMINIO}
=============================================

O QUE PRECISA ESTAR PRONTO NA HOSPEDAGEM
- Um usuário de FTP só para o site, com acesso à pasta do domínio {DOMINIO} (na Hostinger, public_html).
- Certificado SSL (https) ativo no domínio.
- O domínio {DOMINIO} apontando para essa hospedagem.
  Mexer só nos registros do site (raiz e www). NÃO mexer nos registros de e-mail (MX e SPF).

ATENÇÃO SE O DOMÍNIO HOJE MOSTRA O SITE ANTIGO DO CONSTRUTOR DE SITES (caso do enggomes.com)
- Enviar os arquivos por FTP NÃO troca o site que aparece no domínio: o site antigo
  está no Construtor de Sites da Hostinger, que é separado da hospedagem.
- Depois de enviar, no painel da Hostinger: tirar o domínio do Construtor de Sites e ligá-lo
  ao site da hospedagem onde os arquivos foram enviados. Os registros de e-mail continuam como estão.
- Não apagar o site do Construtor até o site novo estar no ar e aprovado: ele serve de volta atrás.
- O domínio usa HSTS: o navegador só aceita https. Ligar o SSL do domínio na hospedagem logo
  depois da troca; até o certificado sair, o site pode dar erro de segurança.

OPÇÃO A: SCRIPT PRONTO (FTP)
1. Dois cliques em  ferramentas\\enviar_ftp.bat
2. Digitar servidor, usuário e senha do FTP quando ele pedir (a senha não aparece e não fica salva).
3. Conferir a pasta de destino que ele mostrar e confirmar. Ele só envia e substitui arquivos; não apaga nada.

OPÇÃO B: FILEZILLA (SFTP/FTPS)
1. Arquivo > Gerenciador de Sites > Novo site.
   Protocolo: SFTP (ou "FTP - FTP com TLS explícito"), servidor, porta, usuário e senha passados pelo cliente.
2. Conectar e abrir, do lado direito, a pasta do domínio (public_html).
3. Se houver um index.html ou default.php de exemplo da hospedagem, apagar.
4. Do lado esquerdo, abrir a pasta  publicar\\site  e enviar TODO o conteúdo dela
   (index.html, assets, .htaccess, robots.txt, sitemap.xml) para dentro de public_html.
   O .htaccess começa com ponto: se não aparecer, menu Servidor > Forçar exibição de arquivos ocultos.

OPÇÃO C: GERENCIADOR DE ARQUIVOS DA HOSPEDAGEM (sem FileZilla)
1. Abrir o gerenciador de arquivos e entrar em public_html do domínio.
2. Enviar o arquivo  publicar\\{DOMINIO}.zip  e usar "Extrair" ali mesmo.
3. Conferir que index.html ficou direto dentro de public_html (e não numa subpasta). Apagar o zip.

DEPOIS DE SUBIR
- Ligar "Forçar HTTPS" no painel da hospedagem, para http virar https sozinho.
- Abrir {URL} no computador e no celular, e testar o galpão 3D e o botão do WhatsApp.
- Opcional: cadastrar o site no Google Search Console e enviar {URL}sitemap.xml.

ATUALIZAR NO FUTURO
- Depois de mudar o site, rodar de novo ferramentas\\enviar_ftp.bat
  (ou preparar_publicacao.bat e enviar o conteúdo novo de publicar\\site por cima do que está no servidor).
- Domínio novo: trocar DOMINIO no começo de ferramentas\\preparar_publicacao.py e enviar de novo.
"""


def main() -> None:
    if SITE.resolve().parent != SAIDA.resolve():
        sys.exit(f"ERRO: pasta de saída inesperada: {SITE}")
    SITE.mkdir(parents=True, exist_ok=True)
    # Esvazia a pasta em vez de apagá-la: assim não trava se ela estiver aberta no Explorer ou num terminal.
    for item in SITE.iterdir():
        if item.is_dir() and not item.is_symlink():
            shutil.rmtree(item)
        else:
            item.unlink()

    with open(RAIZ / "index.html", encoding="utf-8", newline="") as f:
        html = ajustar_index(f.read())
    with open(SITE / "index.html", "w", encoding="utf-8", newline="") as f:
        f.write(html)
    shutil.copytree(RAIZ / "assets", SITE / "assets", ignore=IGNORAR)
    for nome, texto in ((".htaccess", HTACCESS), ("robots.txt", ROBOTS), ("sitemap.xml", SITEMAP)):
        (SITE / nome).write_text(texto, encoding="utf-8", newline="\n")
    (SAIDA / "COMO_PUBLICAR.txt").write_text(INSTRUCOES, encoding="utf-8-sig", newline="\r\n")

    arquivos = sorted(p for p in SITE.rglob("*") if p.is_file())
    for antigo in SAIDA.glob("*.zip"):
        antigo.unlink()
    with zipfile.ZipFile(ZIP, "w", zipfile.ZIP_DEFLATED) as z:
        for p in arquivos:
            z.write(p, p.relative_to(SITE).as_posix())

    total = sum(p.stat().st_size for p in arquivos)
    print(f"Pasta pronta: {SITE}")
    print(f"Zip pronto:   {ZIP} ({ZIP.stat().st_size / 1e6:.1f} MB)")
    print(f"{len(arquivos)} arquivos, {total / 1e6:.1f} MB, para {URL}")
    print(f"Passo a passo: {SAIDA / 'COMO_PUBLICAR.txt'}")


if __name__ == "__main__":
    main()
