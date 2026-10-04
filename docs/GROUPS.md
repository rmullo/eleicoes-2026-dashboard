# Grupos políticos regionais

O painel permite registrar flags personalizadas independentes dos partidos oficiais, para classificar candidatos por alianças ou grupos locais. **A associação é uma anotação do usuário, não um dado do TSE**.

## Interface
1. Clique em **Novo grupo**, escolha nome, cor e descrição.
2. Abra o cargo desejado e, no candidato, use **Marcar grupo político**.
3. Selecione um ou vários grupos para o mesmo candidato.
4. Use o filtro por grupo e veja o total de votos para o cargo selecionado.

O total é a soma dos votos de candidatos distintos associados ao grupo **no cargo atualmente selecionado**. Não representa eleitores únicos, transferência de votos, nem votos que o grupo necessariamente angariou. Candidatos compartilhados aparecem em cada grupo e, portanto, **os totais de grupos não devem ser somados entre si**. Os dados de votação são municipais (Farias Brito).

## API
- `GET /api/groups`: lista grupos.
- `POST /api/groups`: cria grupo.
- `PUT /api/groups/:id`: substitui dados do grupo.
- `DELETE /api/groups/:id`: exclui grupo.

Formato de exemplo:
```json
{"name":"Grupo A","color":"#24b38b","description":"Classificação local","candidates":{"deputado-estadual":["12345"],"governador":["12"]}}
```

Os grupos são persistidos em `/app/data/groups.json` (volume `election-data`). **A API não tem autenticação nesta versão**: qualquer pessoa com acesso à aplicação pode alterar grupos. Para um painel público, é obrigatório proteger POST, PUT e DELETE com autenticação e autorização ou restringi-los à rede privada. Não expor edição pública em produção.
