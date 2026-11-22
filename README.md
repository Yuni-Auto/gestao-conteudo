# gestao-conteudo

Na Gestão de conteúdo, o filtro **Formato dos posts** no quadro Processo de criação
limita apenas os cards do quadro usando chips. Ele é combinado com os filtros gerais de
plataforma e formato; selecione **Todos os formatos** para remover o filtro do
quadro. Os filtros gerais continuam ativos.

Para verificar o filtro, execute `node --test kanban-format.test.cjs`.

Para marcar um post do Instagram como **Em teste**, escolha o status no
formulário, no detalhe do post ou no status individual do Instagram em
**Datas e status diferentes por plataforma**. Também é possível arrastar o
post para a coluna **Em teste**, no grupo **Complete** do Processo de criação. O status das outras
plataformas permanece inalterado; para post novo, elas mantêm o último status
geral escolhido antes de **Em teste**. O Instagram continua recebendo o
lembrete para a publicação oficial, conforme os horários configurados.

Para verificar o status, execute `node --test instagram-test-status.test.cjs`.
