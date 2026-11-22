# gestao-conteudo

Na Gestão de conteúdo, o filtro **Formato dos posts** no quadro Processo de criação
limita apenas os cards do quadro usando chips. Ele é combinado com os filtros gerais de
plataforma e formato; selecione **Todos os formatos** para remover o filtro do
quadro. Os filtros gerais continuam ativos.

Para verificar o filtro, execute `node --test kanban-format.test.cjs`.

No Processo de criação, só é possível arrastar posts para etapas disponíveis
para o formato correspondente. Colunas incompatíveis são destacadas em vermelho.

Na Gestão de conteúdo, a grade **Conteúdos para gravar** mostra uma semana por
vez, considerando o período da etapa Gravando calculado pelo **Tempo de
produção** e pela data de publicação. Um período que cruza semanas aparece em
cada semana correspondente. Posts ainda em Gravando com período anterior à
semana selecionada e posts sem período calculado aparecem em colunas separadas;
para programar os últimos, confira a data e a configuração de tempo de produção.
A navegação é independente do calendário. Em telas pequenas, as colunas ficam
empilhadas.
Os cards são ordenados por dificuldade crescente; conteúdos sem dificuldade
ficam no final. Toque em um card para abrir os detalhes e marcar as cenas
gravadas. O progresso é compartilhado com o controle de produção dos eventos.
O mesmo controle também está disponível nos detalhes dos slides.
A grade mostra todos os posts nessa etapa, independentemente dos filtros do quadro.

Para marcar um post do Instagram como **Em teste**, escolha o status no
formulário, no detalhe do post ou no status individual do Instagram em
**Datas e status diferentes por plataforma**. Também é possível arrastar o
post para a coluna **Em teste**, no grupo **Complete** do Processo de criação. O status das outras
plataformas permanece inalterado; para post novo, elas mantêm o último status
geral escolhido antes de **Em teste**. O Instagram continua recebendo o
lembrete para a publicação oficial, conforme os horários configurados.

Para verificar o status, execute `node --test instagram-test-status.test.cjs`.
