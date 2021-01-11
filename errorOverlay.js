require("css.escape");
// Create a visual error message to overlay the site
module.exports = (error) => `/* Error compiling stylesheet */
html,
body {
  margin: 0;
  padding: 0;
  min-height: 100vh;
} 
body::before { 
  content: ''; 
  background: white;
  top: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  opacity: 0.5;
  position: fixed;
}
body::after { 
  content: "${CSS.escape(error)}"; 
  white-space: pre;
  display: block;
  top: 0; 
  padding: 30px;
  margin: 30px;
  width: calc(100% - 60px);
  background: #ffd1d1;
  border: solid 1px red;
  opacity: 0.9;
  position: fixed;
}`;
