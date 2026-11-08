# Sistema de Escala — início do projeto

A primeira etapa implementada é o cadastro das datas em que cada membro não pode servir.

## Como testar

Abra [`index.html`](./index.html) diretamente no navegador. A tela funciona em celular e computador. Depois de configurar o Supabase, os registros ficam compartilhados; a lista também pode ser exportada em CSV.

## Regras consideradas nesta etapa

- A irmandade atende às igrejas Matriz Espírito Santo, Nossa Senhora de Fátima e Santa Filomena.
- O membro informa seu nome e uma data de indisponibilidade.
- O sistema não permite o mesmo membro cadastrar a mesma data duas vezes.
- Os membros foram carregados a partir da aba `LISTA 2026` da planilha `CONTROLE DE PRESENÇA.xlsx`, removendo repetições.

## Próxima etapa

Criar o gerador de escala usando as missas e as regras de datas especiais descritas em `REGRA_DE_NEGOCIO.txt`.

## Autenticação Google

Foi preparada a estrutura para Supabase em `supabase-config.js` e `supabase-schema.sql`. Preencha a URL e a chave pública (anon/publishable key), execute o schema, habilite Google em Authentication > Providers e cadastre os perfis pelo script de convites. O mapeamento inicial é:

- `danilabbr@gmail.com`: administrador, com acesso à lista.
- `esribeiro43@gmail.com`: usuário, associado a `EDUARDO DOS SANTOS RIBEIRO`, sem acesso à lista.

Essa associação de nome foi inferida pelo e-mail e deve ser confirmada antes da publicação. O convite/login Google ainda depende da criação e configuração do projeto Supabase; nenhuma credencial foi incluída no código.

## Gerar os convites

O arquivo `supabase-invite-users.ps1` envia os convites por e-mail e cria os dois perfis automaticamente. Ele usa a API administrativa do Supabase em ambiente local seguro. A documentação do Supabase determina que essa operação seja feita em servidor/ambiente confiável com a chave secreta, nunca no navegador ([convite por e-mail](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail)).

No PowerShell, depois de criar o projeto Supabase e configurar o provedor de e-mail:

```powershell
$env:SUPABASE_URL = "https://SEU-PROJETO.supabase.co"
$env:SUPABASE_SECRET_KEY = "SUA_CHAVE_SECRETA_OU_SERVICE_ROLE"
$env:SUPABASE_REDIRECT_URL = "https://SEU-DOMINIO/index.html"
./supabase-invite-users.ps1
```

Não cole a chave secreta no chat, no `supabase-config.js` ou no Git. O script é idempotente para perfis: se a conta já existir, ele reaproveita o usuário e atualiza o perfil, mas não reenvia convite automaticamente.
