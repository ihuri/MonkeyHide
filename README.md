# 🙈 MonkeyHide

**MonkeyHide** é uma extensão leve para o Google Chrome (Manifest V3) que permite selecionar e esconder elementos indesejados de qualquer site de forma simples e permanente.

---

## ✨ Funcionalidades

- 🎯 **Seleção Visual na Página:** Passe o mouse sobre qualquer elemento do site e clique para escondê-lo.
- 📝 **Descrição Opcional:** Adicione uma descrição personalizada para lembrar facilmente o que cada seletor esconde (ex: _"Banner do topo"_, _"Barra lateral"_).
- 🌐 **Gerenciamento por Site (Domínio):** Ative/desative as regras de um site com um clique ou gerencie todos os seus sites salvos pelo popup.
- ⚡ **Ocultação Instantânea:** Injeta CSS (`display: none !important`) logo no carregamento da página (`document_start`), evitando que os elementos pisquem na tela.
- 🛠️ **Adição Manual de Seletores CSS:** Permite cadastrar seletores CSS manualmente para qualquer domínio.

---

## 🚀 Como instalar (Modo Desenvolvedor)

1. Faça o clone ou download deste repositório:
   ```bash
   git clone https://github.com/ihuri/MonkeyHide
   ```
2. Abra o Google Chrome e acesse `chrome://extensions/`.
3. Ative a chave **Modo do desenvolvedor** (_Developer mode_) no canto superior direito.
4. Clique em **Carregar sem compactação** (_Load unpacked_) e selecione a pasta do projeto.

---

## 📖 Como usar

1. Abra o site onde deseja esconder um elemento.
2. Clique no ícone do **MonkeyHide (`🙈`)** na barra de extensões do Chrome.
3. Clique em **🎯 Selecionar na página**.
4. Passe o mouse até destacar o elemento desejado e clique nele.
5. _(Opcional)_ Digite uma descrição para identificar o elemento e pressione `Enter` ou clique em **Esconder**.

---

## 📂 Estrutura do Projeto

- `manifest.json` — Configuração da extensão Chrome (Manifest V3)
- `popup.html` / `popup.css` / `popup.js` — Interface do gerenciador de sites e elementos
- `content.js` / `content.css` — Seletor visual de elementos e injeção automática de estilos
- `icons/` — Ícones da extensão (`16px`, `32px`, `48px`, `128px`)
