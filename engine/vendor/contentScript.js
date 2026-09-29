/**
 * Created by sanjay kumar on 25/06/2020.
 */

var isFirefox = typeof InstallTrigger !== "undefined";
var isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

var inputText = "";
var recorderActive = false;
var attrArr = `,withid,withclass,withname,withplaceholder,withtext`;

var frameOriframe = "";

function getDocument() {
  _document = "";
  if (document.querySelector("*[xpathtest='1']")) {
    _document = document;
  } else {
    try {
      getAlliframe(document);

      var numOfIframes = Object.keys(allIframes).length;
      for (var j = 0; j < numOfIframes; j++) {
        var tempIframes = allIframes["iframe" + j];
        for (var i = 0; i < tempIframes.length; i++) {
          try {
            if (
              tempIframes[i].contentWindow.document.querySelector(
                "*[xpathtest='1']"
              )
            ) {
              _document = tempIframes[i].contentWindow.document;
              frameOriframe = "iframe";
              return;
            }
          } catch (err) {}
        }
      }
    } catch (err) {}
  }
}

function iframeOfFrame(element) {
  var alliframes = document.querySelectorAll("iframe");
  for (var i = 0; i < alliframes.length; i++) {
    try {
      if ((alliframes[i].contentWindow.document = element.ownerDocument)) {
        frameOriframe = "iframe";
        return;
      }
    } catch (err) {}
  }

  var allframes = document.querySelectorAll("frame");
  for (var i = 0; i < allframes.length; i++) {
    try {
      if ((alliframes[i].contentWindow.document = element.ownerDocument)) {
        frameOriframe = "frame";
        return;
      }
    } catch (err) {}
  }
}

function isEven(n) {
  return n % 2 == 0;
}

function isOdd(n) {
  return Math.abs(n % 2) == 1;
}

function isSpecialCharValidForSelector(selector) {
  return !/[~`!#$%\^&*+=\-\(\)\\';,{}|\\":<>\?]/g.test(selector);
}

function validAfterClosedSquare(selector) {
  var arr = selector.split("]");

  for (var i = 1; i <= arr.length - 1; i++) {
    if (
      arr[i].charAt(0) &&
      arr[i].charAt(0) != "/" &&
      arr[i].charAt(0) != "["
    ) {
      return false;
    }
  }
  return true;
}

// $ is used to identify the error in selector
function errorInSelector(xpathOrCss, selector){
  var errorMsg = " ";
  var regexForAlpha = /^[A-Za-z]+$/;

  if(selector.includes("“")){
      return {index: 1, message: `XPath does not support tilted “ quote. Use vertical " quote.`}
  }

  if(selector.includes("”")){
      return {index: 2, message: `XPath does not support tilted ” quote. Use vertical " quote.`}
  }

  if(selector.includes("‘")){
      return {index: 3, message: `XPath does not support tilted ‘ quote. Use vertical ' quote.`}
  }

  if(selector.includes("’")){
      return {index: 4, message: `XPath does not support tilted ’ quote. Use vertical ' quote.`}
  }

  if(selector.includes("///") || selector.includes("////") || selector.includes("/////") || selector.includes("//////")){
      return {index: 5, message: "more than 2 / together not allowed"}
  }

  if(selector == "//"){
      if(xpathOrCss.includes("css")){
          return {index: 6, message: "// not allowed."};
      }else{
          return {index: 7, message: "add tagName after //"};
      }
  }

  if(selector.charAt(selector.length-1) == "/"){
      if(xpathOrCss.includes("css")){
          return {index: 8, message: "forward slash / not allowed."};
      }else{
          return {index: 9, message: "add tagName after forward slash /"};
      }
  }

  var noOfSingleQuote = selector.match(/\'/g) ? selector.match(/\'/g).length : 0;
  if(isOdd(noOfSingleQuote)){
      return {index: 10, message: "single quote ' missing"};
  }

  var noOfDoubleQuote = selector.match(/\"/g) ? selector.match(/\"/g).length : 0;

  if(isOdd(noOfDoubleQuote)){
      return {index: 11, message: 'double quote " missing'};
  }
  
  var noOfOpenBracket = selector.match(/\(/g) ? selector.match(/\(/g).length : 0;
  var noOfCloseBracket = selector.match(/\)/g)? selector.match(/\)/g).length : 0;

  if(noOfOpenBracket != noOfCloseBracket){
      return {index: 12, message: noOfOpenBracket > noOfCloseBracket ? "close parenthesis ) missing" : "open parenthesis ( missing"};
  }
  
  var noOfOpenSquareBracket = selector.match(/\[/g) ? selector.match(/\[/g).length : 0;
  var noOfCloseSquareBracket = selector.match(/\]/g) ? selector.match(/\]/g).length : 0;
  
  if(noOfOpenSquareBracket != noOfCloseSquareBracket){
      return {index: 13, message: noOfOpenSquareBracket > noOfCloseSquareBracket ? "close square bracket ] missing" : "open square bracket [ missing"};
  }

  var noOfColon = selector.match(/\:/g) ? selector.match(/\:/g).length : 0;
  if(isOdd(noOfColon)){
      if(xpathOrCss.includes("css")){
          return {index: 14, message: "colon : not allowed."};
      }else{
          return {index: 15, message: 'colon : missing'};
      }
  }

  var contentInsideSquareBracket = /[^[\]]+(?=])/g;

  if(selector.includes('[') && selector.includes(']')){
      if(!contentInsideSquareBracket.exec(selector)){
          return {index: 16, message: "Value inside square brackets [] missing"};
      }
  }
  

  // var contentInsideParanthesis = /\(([^)]+)\)/;
  // if(selector.includes('(') && selector.includes(')') && !contentInsideParanthesis.exec(selector) && !selector.includes('text()') && !selector.includes('name()') && !selector.includes('last()') && !selector.includes('position()')){
  //     return "Value inside parenthesises () missing";
  // }

  if((selector.split(']').length>2 || (selector.split(']').length==2 && selector.split(']')[1])) && !validAfterClosedSquare(selector)){
      return {index: 17, message: xpathOrCss.includes("css") ? "after ] only [ allowed" : "after ] only / and [ allowed"};
  }

  if(selector.includes("::") && !selector.split("::")[1]){
          return {index: 18, message: "tagName missing after ::"};
  }

  if(selector.split("::")[1] && !regexForAlpha.test(selector.split("::")[1])){
          return {index: 19, message: "only tagName allowed after ::"};
  }

  
  if(selector.includes("/")){
      selector = selector.replaceAll("//", "/");
      var arr = selector.split("/");
      for(var i = 0; i < arr.length-1; i++){
          if(arr[i] && (regexForAlpha.test(arr[i].charAt(0)) || arr[i].charAt(0) == '.' || arr[i].charAt(0) == '*')){
             return "";
          }else if(arr[i]){
              return {index: 20, message: "after / only . * and tagname allowed"};
          }
      }
  }
  

  if(/[^[\]]+(?=])/g.exec(selector)){
      var valueOutsideSquareBracket = replaceAll(selector, "["+/[^[\]]+(?=])/g.exec(selector)[0]+"]", "");
      if(!isSpecialCharValidForSelector(valueOutsideSquareBracket)){
          return {index: 21, message: "special char not allowed outside []"};
      }
  }

  /*
  if(/\(([^)]+)\)/.exec(selector)){
      var valueOutsideParanthesis = replaceAll(selector, "("+/\(([^)]+)\)/.exec(selector)[0]+")", "");
  }
  */

  if(selector.includes(";")){
      return {index: 22, message: "semicolon ; not allowed"};
  }

  if(selector.includes("{") || selector.includes("}")){
      return {index: 23, message: "curly brackets { } not allowed"};
  }

  if(selector.includes("normalise-space")){
      return {index: 24, message: "wrong spelling, use 'normalize' in place of 'normalise'"};
  }

  if(selector.includes("ends-with(")){
      return {index: 25, message: "ends-with() is XPath 2.0 function which browser doesn't support. Use XPath 1.0 functions."};
  }

  if(selector.includes("upper-case(")){
      return {index: 26, message: "upper-case() is XPath 2.0 function which browser doesn't support. Use XPath 1.0 functions."};
  }

  if(selector.includes("lower-case(")){
      return {index: 27, message: "lower-case() is XPath 2.0 function which browser doesn't support. Use XPath 1.0 functions."};
  }

  if(selector.includes("matches(")){
      return {index: 28, message: "matches() is XPath 2.0 function which browser doesn't support. Use XPath 1.0 functions."};
  }
  
  errorMsg = errorMsg ? "Check the syntax & spelling." : errorMsg;

  return errorMsg;
}

function getBetweenContent(selector, char){
  let getBetweenBracketsRegex = /\[((?:[^[\]]|\[[^[\]]*\])*)\]/g;
  let getBetweenParenthesesRegex = /\(((?:[^[\()]|\([^[\)]*\))*)\)/g;

  let indexOfFirstBracket = selector.indexOf("[");
  let indexOfFirstParenthesis = selector.indexOf("(");

  let selectedRegex = indexOfFirstBracket;
  if(selector.includes("[")){
      if(selector.includes("(")){
          selectedRegex = indexOfFirstBracket < indexOfFirstParenthesis ? getBetweenBracketsRegex : getBetweenParenthesesRegex;
      }else{
          selectedRegex = getBetweenBracketsRegex;
      }
  }else if(selector.includes("(")){
      if(selector.includes("[")){
          selectedRegex = indexOfFirstBracket < indexOfFirstParenthesis ? getBetweenBracketsRegex : getBetweenParenthesesRegex;
      }else{
          selectedRegex = getBetweenParenthesesRegex;
      }
  }


  let result = selector.match(selectedRegex);
  if(result && result.length > 0){
      for(let i = 0; i < result.length; i++){
          let target = result[i].replace(result[i].charAt(0), "");
          target = target.replace(target.charAt(target.length - 1), "");
          if((target.includes("[") || target.includes("(")) && target.includes(char)){
              return getBetweenContent(target, char);
          }
          if(target.match(char === "'" ? /\'/g : /\"/g).length % 2 != 0){
              let chosenTarget = target.includes(char) ? target : selector
  
              let splitBy = chosenTarget.indexOf("=") > -1 ? "=" : ",";
              let splitResult = chosenTarget.split(splitBy);
              let selectedResult = splitResult.filter(item => item.includes(char))[0];
              let trimResult = selectedResult.trim();
              let rawResult = trimResult.replaceAll(char, "");
              let finalResult = char + rawResult + char;
              return [selectedResult, finalResult];
          }
      }
  }else{

  }

  return null;
}

function fixSelector(errorIndex, selector){
  let fixedSelector = selector;
  let regex = "";
  let result = "";
  let matches = [];

  switch (errorIndex) {
      case 1:
          fixedSelector = fixedSelector.replaceAll("“", '"');
          break;
      case 2:
          fixedSelector = fixedSelector.replaceAll("”", '"');
          break;
      case 3:
          fixedSelector = fixedSelector.replaceAll("‘", "'");
          break;
      case 4:
          fixedSelector = fixedSelector.replaceAll("’", "'");
          break;
      case 5:
          matches = fixedSelector.match(/\/{3,}/g);
          if(matches && matches.length > 0){
              matches.forEach(match => {
                  fixedSelector = fixedSelector.replaceAll(match, "//");
              });
          }
          break;
      case 6:
          fixedSelector = fixedSelector.replaceAll("//", "");
          break;
      case 7:
          fixedSelector = fixedSelector.replaceAll("//", "//div");
          break;
      case 8:
          fixedSelector = fixedSelector.replaceAll("/", "");
          break;
      case 9:
          fixedSelector = fixedSelector.replaceAll("/", "");
          break;
      case 10:
          result = getBetweenContent(fixedSelector, "'");
          fixedSelector = fixedSelector.replace(result[0], result[1]);
          break;
      case 11:
          result = getBetweenContent(fixedSelector, '"');
          fixedSelector = fixedSelector.replace(result[0], result[1]);
          break;
      case 12:
          fixedSelector = null;
          break;
      case 13:
          fixedSelector = null;
          break;
      case 14:
          fixedSelector = fixedSelector.replaceAll(":", "");
          break;
      case 15:
          matches = fixedSelector.match(/:{3,}/g);
          if(matches && matches.length > 0){
              matches.forEach(match => {
                  fixedSelector = fixedSelector.replaceAll(match, "::");
              });
          }

          matches = fixedSelector.match(/(?<!:):{1}(?!:)/g);
          if(matches && matches.length > 0){
              matches.forEach(match => {
                  fixedSelector = fixedSelector.replaceAll(match, "::");
              });
          }
          break;
      case 16:
          fixedSelector = fixedSelector.replaceAll("[]", "");
          break;
      case 17:
          fixedSelector = null;
          break;
      case 18:
          fixedSelector = null;
          break;
      case 19:
          fixedSelector = null;
          break;
      case 20:
          fixedSelector = null;
          break;
      case 21:
          target = fixedSelector;
          matches = fixedSelector.match(/[^[\]]+(?=])/g);
          if(matches && matches.length > 0){
              matches.forEach(match => {
                  target = target.replace(["[", match, "]"].join(""), "__marker__");
              });

              target = target.replace(/[~`!#$%\^&*+=\-\(\)\\';,{}|\\":<>\?]/g, "");

              matches.forEach(match => {
                  target = target.replace("__marker__", "[" + match + "]");
              });
          }else{
              target = target.replace(/[~`!#$%\^&*+=\-\(\)\\';,{}|\\":<>\?]/g, "");
          }

          fixedSelector = target;
          break;
      case 22:
          fixedSelector = fixedSelector.replaceAll(";", "");
          break;
      case 23:
          fixedSelector = fixedSelector.replaceAll("}", "");
          fixedSelector = fixedSelector.replaceAll("{", "");
          break;
      case 24:
          fixedSelector = fixedSelector.replaceAll("normalise-space", "normalize-space");
          break;
      case 25:
          regex = /ends-with\(((?:[^[\()]|\([^[\)]*\))*)\)/g;
          matches = fixedSelector.match(regex);
          if(matches && matches.length > 0){
              matches.forEach(match => {
                  let target = match.replace("ends-with(", "");
                  target = target.replace(")", "");
                  let splitTarget = target.split(",");
                  // string-length(title) - string-length('s') = substring(title, string-length(title) - string-length('s') + 1)
                  fixedSelector = fixedSelector.replaceAll(match, "string-length(" + splitTarget[0] + ") - string-length(" + splitTarget[1] + ") = substring(" + splitTarget[0] + ", string-length(" + splitTarget[0] + ") - string-length(" + splitTarget[1] + ") + 1)");
              });
          }
          break;
      case 26:
          regex = /upper-case\(((?:[^[\()]|\([^[\)]*\))*)\)/g;
          matches = fixedSelector.match(regex);
          if(matches && matches.length > 0){
              matches.forEach(match => {
                  let target = match.replace("upper-case(", "");
                  target = target.replace(")", "");
                  fixedSelector = fixedSelector.replaceAll(match, "translate(" + target + ", 'abcdefghijklmnopqrstuvwxyz','ABCDEFGHIJKLMNOPQRSTUVWXYZ')");
              });
          }
          break;
      case 27:
          regex = /lower-case\(((?:[^[\()]|\([^[\)]*\))*)\)/g;
          matches = fixedSelector.match(regex);
          if(matches && matches.length > 0){
              matches.forEach(match => {
                  let target = match.replace("lower-case(", "");
                  target = target.replace(")", "");
                  fixedSelector = fixedSelector.replaceAll(match, "translate(" + target + ", 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')");
              });
          }
          break;
      case 28:
          fixedSelector = null;
          break;
  }
  return fixedSelector;
}

function fullFixSelector(xpathOrCss, selector){
  let newSelector = selector;
  let hasError = errorInSelector(xpathOrCss, newSelector);
   while(hasError.index){
       newSelector = fixSelector(hasError.index, newSelector);
       hasError = errorInSelector(xpathOrCss, newSelector);
   }

  return newSelector;
  
}

function replaceAll(str, a, b) {
  return str.split(a).join(b);
}

var oldNodes = [];
var oldAttribute = "";
var allNodes = [];
var idChecked = "";
//var _document = "";
var pageUrl = "websiteUrl-" + document.URL;
var inspectedElement = "";
var elementInShadowDom = "";
var element = "";
var suggestedFlag = false;

var appendAttribute = function (element, attributeName, attributeValue) {
  if (attributeName.includes("xpath")) {
    attributeName = "xpath";
  }
  try {
    element.setAttribute(attributeName, attributeValue);
  } catch (err) {
    return;
  }
};
var deleteAttribute = function (element, attributeName, onChange) {
  try {
    attributeName = oldAttribute;
    element.removeAttribute(attributeName);
    if (element.nodeName.toLowerCase().includes("svg")) {
      element.style.border = "";
    } else {
      element.style.outline = "";
    }
  } catch (err) {
    return;
  }
};

function getElementsByXPath(xpath) {
  try {
    let results = [];
    let query = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );
    for (let i = 0, length = query.snapshotLength; i < length; ++i) {
      results.push(query.snapshotItem(i));
    }
    return results.length;
  } catch (err) {
    console.warn(err, "NOT VALID");
  }
}

function calculateElements(obj) {
  obj = JSON.parse(obj);
  if (!obj.xpath) return false;

  let elementsCount = getElementsByXPath(obj.xpath);
  if (elementsCount) {
    //chrome.runtime.sendMessage({ type: "elementsCount", id: obj.id, elementCount: elementsCount });
    return { type: "elementsCount", id: obj.id, elementCount: elementsCount };
  }
  return false;
}

var allDocuments = [];

function getAllDocument() {
  allDocuments.push(document);

  var alliframes = document.querySelectorAll("iframe");

  for (var i = 0; i < alliframes.length; i++) {
    try {
      allDocuments.push(alliframes[i].contentWindow.document);
      frameOriframe = "iframe";
    } catch (err) {}
  }

  var allframes = document.querySelectorAll("frame");
  for (var i = 0; i < allframes.length; i++) {
    try {
      allDocuments.push(allframes[i].contentWindow.document);
      frameOriframe = "frame";
    } catch (err) {}
  }
}

// window.addEventListener("contextmenu", function(event){
//     var ele = event.path[0];
//     console.log(ele);
//     // console.log("window right click"+event.shadowRoot.target);
// });

var contextElement = null;
var contextSelectors = [];
var rightClickFunction = "";
var buildContextMenuResultFunction = "";

setTimeout(function () {
  if (
    pageUrl.includes("https://docs.google.com/forms/") ||
    pageUrl.includes("https://docs.google.com/document/") ||
    (!pageUrl.includes("https://docs.google.com/") &&
      !pageUrl.includes("https://drive.google.com/"))
  ) {
    chrome.storage.local.get("contextMenu", function (result) {
      contextMenu = result.contextMenu ? result.contextMenu : "active";
      if (contextMenu) {
        if (!contextMenu.includes("inactive")) {
          buildContextMenuResultFunction();
        } else {
        }
      } else {
      }
    });
  }

  rightClickFunction = function (event) {
    try {
      contextSelectors = [];
      //for other browser
      var contextElement = event.composedPath()[0];
      createSelectorsForContextMenu(contextElement);
      //chrome.runtime.sendMessage({ contextSelectors: contextSelectors });
    } catch (err) {
      console.log(err);
    }
  };

  getAllDocument();

  //for safari browser
  if (isSafari) {
    document.addEventListener("contextmenu", rightClickFunction, true);
  }

  buildContextMenuResultFunction = function () {
    for (var i = 0; i < allDocuments.length; i++) {
      allDocuments[i].addEventListener("contextmenu", rightClickFunction, true);
    }
    //document.addEventListener("contextmenu", rightClick, true);
  };
}, 1000);

function copyValueToClipboard(valueToCopy) {
  var el = document.createElement("textarea");
  el.value = valueToCopy;
  document.body.appendChild(el);
  el.select();
  document.execCommand("copy");
  document.body.removeChild(el);
}

var generateContextMenu = false;

function createSelectorsForContextMenu(contextElement) {
  _document = contextElement.ownerDocument;

  generateContextMenu = true;
  var insideIframe = "";
  var shadowdom = "";

  elementInShadowDom = isInShadow(contextElement);

  var chooseAttrsForXpath1 = [
    "withid",
    "withclass",
    "withname",
    "withplaceholder",
    "withtext",
  ];

  var nodeName = contextElement.nodeName.toLowerCase();

  let elName = contextElement.name || "name attribute is not available for this element";
  let elId = contextElement.id || "id attribute is not available for this element";

  absXpath = createAbsXpath(contextElement)[0];

  contextSelectors[0] =
    insideIframe + createRelXpath(contextElement, chooseAttrsForXpath1)[0];
  globalRelXpath = contextSelectors[0];

  contextSelectors[1] = createCssSelector(
    contextElement,
    chooseAttrsForXpath1
  )[0].trim();
  contextSelectors[2] =
    'document.querySelector("' + contextSelectors[1].trim() + '")';

  contextSelectors[3] = insideIframe + absXpath;

  //testRigorPath
  contextSelectors[4] = insideIframe + createTestRigorPath(contextElement)[0];

  contextSelectors[5] = elId;
  contextSelectors[6] = elName;

  if (contextElement.ownerDocument !== document) {
    insideIframe = "This element is in iframe - ";
    contextSelectors[0] = insideIframe + contextSelectors[0];
    contextSelectors[1] = insideIframe + contextSelectors[1];
    contextSelectors[2] = insideIframe + contextSelectors[2];
    contextSelectors[3] = insideIframe + contextSelectors[3];
    contextSelectors[4] = insideIframe + contextSelectors[4];
    contextSelectors[5] = insideIframe + contextSelectors[5];
    contextSelectors[6] = insideIframe + contextSelectors[6];
  } else if (elementInShadowDom) {
    insideIframe = "This element is in shadowDOM - ";
    contextSelectors[1] = insideIframe + contextSelectors[1];
    contextSelectors[2] = insideIframe + contextSelectors[2];
    elementInShadowDom = false;
  }

  generateContextMenu = false;
}

let els = [];
function querySelectorAllIframes(selector, el = document){
  let frames = [];
  let iframes = Array.from(el.querySelectorAll("iframe"));

  const childShadows = Array.from(el.querySelectorAll('*')).
  map(el => el.shadowRoot).filter(Boolean);
  
  let iframesDocs = iframes.map(iframe => {
      try{
          return iframe.contentWindow.document
      }catch(_){
          return;
      }
  })
  frames = [...iframesDocs, ...childShadows]

  if(frames.length > 0){
      frames.forEach(frame => {
          if(frame){
              frame.querySelectorAll(selector).forEach(el => els.push(el));
              querySelectorAllIframes(selector, frame);
          }
      })
  }
}

function queryElement(query){    
  let elements = [];



  let topElements = document.querySelectorAll(query);
  topElements.forEach(element => elements.push(element));

  querySelectorAllIframes(query);

  els.forEach(el => elements.push(el));
  els = [];

  return elements;
}

function removePreviousInspectedElement(){
  let elements = queryElement("[sh-att]");
  elements = [...elements, ...queryElement("[shub-ins]")]
  
  if(elements.length > 0){
      elements.forEach(element => {
          element.removeAttribute("sh-att");
          element.removeAttribute("shub-ins");
      });
  }
}

let documentIframes = []
function allDocumentIframes(doc){
  let elements = doc.querySelectorAll("iframe");
  documentIframes = [...documentIframes, ...elements];
  elements.forEach(el => {
    try {
      let document = el.contentDocument || el.contentWindow.document
      allDocumentIframes(document)
    } catch (error) {}
  })
}

var contextMenu = "active";
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.name && message.name.includes("copy")) {
    var valueToCopy = message.name;

    // chrome.runtime.sendMessage({name:"contextmenu", value:valueToCopy});

    valueToCopy = valueToCopy.includes("relXpath")
      ? contextSelectors[0]
      : valueToCopy.includes("relCssSelector")
      ? contextSelectors[1]
      : valueToCopy.includes("jspath")
      ? contextSelectors[2]
      : valueToCopy.includes("testRigor")
      ? contextSelectors[4]
      : valueToCopy.includes("abs")
      ? contextSelectors[3]
      : valueToCopy.includes("id") 
      ? contextSelectors[5] 
      : valueToCopy.includes("name") 
      ? contextSelectors[6] 
      : contextSelectors[4];
    if (valueToCopy) {
      copyValueToClipboard(valueToCopy);
    }
  }

  if(message.name && message.name === "activate-inspector") activateInspector();
  if(message.name && message.name === "desactivate-inspector") desactivateInspector();

  if(message.name && message.name === "side-panel"){
    isSidePanel = true;
  }

  if(message.name && message.name === "check-inspector-status"){
    sendRuntimeMessage({ action: "check-inspector-state" })
}
  
  if(message.name && message.name === "turn-on-debugger"){
    turnOnDebugger(message.debuggerTime);
 }
  
  if (message && message.name === "toggle-btn inactive") {
    document.removeEventListener("contextmenu", rightClickFunction, true);
    contextMenu = "inactive";
    chrome.storage.local.set({ contextMenu: contextMenu });
  } else if (message && message.name === "toggle-btn active") {
    contextMenu = "active";
    buildContextMenuResultFunction();
    chrome.storage.local.set({ contextMenu: contextMenu });
  }

  if(message.name && message.name === "execute-js"){
    let { scriptValue } = message;
    let result = executeJs(scriptValue);
    sendRuntimeMessage({ name: message.name + "-result", result });
 }

  if(message.name && message.name === "calculate-elements"){
    let { data, commandActive } = message;
    let result = calculateElements(data, commandActive);
    sendRuntimeMessage({ name: message.name + "-result", result });
 }

  if(message.name && message.name === "check-invalid-selector"){
    let result = checkInvalidSelector(message.xpathValue);
    chrome.runtime.sendMessage({ name: message.name + "-result", xpathValue: message.xpathValue, result });
 }

  if(message.name && message.name === "fix-selector"){
    let result = fullFixSelector(message.xpathOrCss, message.selector);
    chrome.runtime.sendMessage({ name: message.name + "-result", result });
  }

  if(message.name && message.name === "shub-test-locator"){
    shubHandleTestLocatorMessage(message);
  }
  if(message.name && message.name === "get-iframe" && window.top === window.self){
    let { baseUri, prevRes } = message
    let iframeSelector = "";
    let iframeXpath = "";
    if(baseUri){
      documentIframes = [];
      allDocumentIframes(document);
      for(let i=0;i<documentIframes.length;i++){
        let iframe = documentIframes[i];
        if(iframe.attributes.length > 0){
          for(let j=0;j<iframe.attributes.length;j++){
            let att = iframe.attributes[j];
            if(att.value === baseUri){
              iframeXpath = createRelXpath(
                iframe,
                ",withid,withclass,withname,withplaceholder,withtext"
              );

              if(!iframe.contentDocument){
                iframeSelector = ["frame", iframeXpath, [], true];
                break;
              }else{
                let iframe_doc = iframe.contentDocument || iframe.contentWindow.document;
                parentiframeXpath = []
                getIframeXpath(iframe_doc);
                iframeSelector = ["frame", iframeXpath, parentiframeXpath];
                parentiframeXpath = []
              }
            }
          }
        }
      }
      // iframeSelector = ["frame", iframeXpath, parentiframeXpath];
    }

    prevRes.iframeSelector = iframeSelector;
    chrome.runtime.sendMessage({ name: message.name + "-result", result: prevRes });
  }

  if(message.name && message.name === "highlight-element"){
    let { name, xpathOrCss, val, onChange, chooseAttrs, baseUri } = message;
    let result = verifyXpathSelectors(name, xpathOrCss, val, onChange, chooseAttrs, baseUri);
    chrome.runtime.sendMessage({ name: message.name + "-result", result });
  }

  if(message.name && message.name === "assign-parent-element"){
    let elements = queryElement("[sh-att]");

    if(!elements[0]){
        elements = queryElement("[shub-ins]");
    };

    if(elements[0]){
        assignParentElement(elements[0]);
    }else{
        // console.log("Failed: " + message.name);
    }
  }

  if(message.name && message.name === "create-axes-xpath-for-element"){
    let elements = queryElement("[sh-att]");
    if(elements[0]){
        let result = createAxesXpathForElement(elements[0]);
        chrome.runtime.sendMessage({ name: message.name + "-result", result });
    }else{
        // console.log("Failed: " + message.name);
    }
  }
  if(message.name && message.name === "calculate-elements"){
    let { data, commandActive } = message;
    let result = calculateElements(data, commandActive);
    chrome.runtime.sendMessage({ name: message.name + "-result", result });
  }

  if(message.name && message.name === "prepare-list-of-attr-text"){
    let elements = queryElement("[sh-att]");
    if(!elements[0]){
        if(message.isCodeBtnAction) {
            elements[0] = prevInspectedEl;
        }else {
            elements = queryElement("[shub-ins]");
        }
    }

    
    if(elements[0]){
        let result = prepareListOfAttrText(elements[0]);
        chrome.runtime.sendMessage({ name: message.name + "-result", result });
    }else{
        // console.log("Failed: " + message.name);
    }
  }

  if(message.name && message.name === "element-type-and-info"){
    let elements = [];

    if(message.shadowRootStatus === "closed"){
        elements = [message.shadowRootStatus];
    }else if( message.shadowRootStatus === "comment"){
        elements = ["comment"];
    }else{
        elements = queryElement("[sh-att]");

        if(!elements[0]){
            if(message.isCodeBtnAction) {
                elements[0] = prevInspectedEl;
            }else{
                elements = queryElement("[shub-ins]");
            }
        }
    }
    if(elements[0]){
        let result = elementTypeAndInfo(elements[0]);
        chrome.runtime.sendMessage({ name: message.name + "-result", result });
    }else{
        //console.log("Failed: " + message.name);
    }
  }

  if(message.name && message.name === "on-inspect-element-click"){
    let elements = [];

    if(message.shadowRootStatus === "closed"){
        elements = [message.shadowRootStatus];
    }else if( message.shadowRootStatus === "comment"){
        elements = ["comment"];
    }else{
        elements = queryElement("[sh-att]");

        if(!elements[0]){
            if(message.isCodeBtnAction) {
                elements[0] = prevInspectedEl;
            }else{
                elements = queryElement("[shub-ins]");
            }
        }
    }

    if(elements[0]){
        let result = onInspectElementClick(elements[0], message.chooseAttrs, message.hubMode, message.options);
        chrome.runtime.sendMessage({ name: message.name + "-result", result });
        prevInspectedEl = elements[0];
        removePreviousInspectedElement();
    }else{
        //console.log("Failed: " + message.name);
    }
  }

  if(message.name && message.name === "tag-element"){
    let element = window.top.document.querySelector(message.query);
    element.setAttribute("shub-ins", 1);
  }

  if (_document) {
    if ((message.xpath || message.xpath === "")) {
        if (message.name.includes("highlight-element")) {
            if (!message.xpath[1]) {
                message.name = 'xpath';
            } else if (message.xpath[1].charAt(0).includes("/") || message.xpath[1].charAt(0).includes("(") || message.xpath[1].substr(0, 2).includes('./')) {
                message.name = 'xpath';
            } else {
                message.name = 'css';
            }
            // message.name = elementInShadowDom?'css':message.name;
            if (message.xpath[1]) {
                passResultsToDevtoolsScript(message.name, message.xpath[1], message.xpath[2], message.xpath[3]);
            }
        }
    }

    if (message.name === "xpath") {
        var ele = _document.querySelector('[xpath="' + message.index + '"]');
        if (ele) {
            var outlineOrBorder = ele.nodeName.toLowerCase().includes("svg") ? "border" : "outline";
            //ele.style.outline= "2px dotted orangered !important";
            ele.style.cssText = outlineOrBorder + ':2px solid orangered !important';
            if (isFirefox) {
              if(!message.isSidePanel) ele.scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" });
            } else {
              if(!message.isSidePanel) ele.scrollIntoViewIfNeeded();
            }
        }
    }

    if (message.name === "xpath-remove") {
        var ele = _document.querySelector('[xpath="' + message.index + '"]');
        if (ele) {
            if (ele.nodeName.toLowerCase().includes("svg")) {
                ele.style.border = "";
            } else {
                ele.style.outline = "";
            }
        }
    }

    if (message.name === "css") {
        var ele = "";
        if (elementInShadowDom) {
            try {
                ele = inspectedElement.getRootNode().host.shadowRoot.querySelector('[css="' + message.index + '"]');
            } catch (err) { }
        } else {
            ele = _document.querySelector('[css="' + message.index + '"]');
        }
        if (ele) {
            var outlineOrBorder = ele.nodeName.toLowerCase().includes("svg") ? "border" : "outline";
            // ele.style.outline= "2px dotted orangered !important";
            ele.style.cssText = outlineOrBorder + ':2px solid orangered !important';
            if (isFirefox) {
              if(!message.isSidePanel) ele.scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" });
            } else {
              if(!message.isSidePanel) ele.scrollIntoViewIfNeeded();
            }
        }
    }
    if (message.name === "css-remove") {
        var ele = "";
        if (elementInShadowDom) {
            ele = inspectedElement.getRootNode().host.shadowRoot.querySelector('[css="' + message.index + '"]');
        } else {
            ele = _document.querySelector('[css="' + message.index + '"]');
        }
        //var ele = _document.querySelector('[css="' + message.index + '"]');
        if (ele) {
            if (ele.nodeName.toLowerCase().includes("svg")) {
                ele.style.border = "";
            } else {
                ele.style.outline = "";
            }
        }
    }
    message.xpath = "";
}

  if (message && message.attrArray) {
    attrArr = message.attrArray;
  }
});

let inspectorActivated = false;
sendRuntimeMessage({ action: "check-inspector-state" });

function activateInspector(){
  inspectorActivated = true;
  addInspectListeners();
}
function desactivateInspector(){
  inspectorActivated = false;
  removeInspectListeners();
}

function createIdSelector(element) {
  _document = element.ownerDocument;
  var totalMatch = 0;
  if (element.id && !elementInShadowDom) {
    var id = element.id;
    id = deleteLineGap(id);

    var idXpath = "//*" + "[@id='" + id + "']";
    var cssSelector = "#" + id;
    if (elementInShadowDom) {
      totalMatch = cssSelectorMatchingNode(element, cssSelector);
    } else {
      totalMatch = _document.evaluate(
        idXpath,
        _document,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      ).snapshotLength;
    }
    var result = [];
    result.push(id);
    result.push(totalMatch);
    return result;
  }
}

function createClassNameSelector(element) {
  _document = element.ownerDocument;
  var totalMatch = 0;
  if (element.attributes["class"]) {
    var className = element.attributes["class"].value;
    className = deleteLineGap(className);

    //var classNameXpath = element.nodeName.toLowerCase() + "[class='" + className + "']";
    var cssSelector = "." + className.replace(/ /g, ".");

    totalMatch = cssSelectorMatchingNode(element, cssSelector);

    var result = [];
    result.push(className);
    result.push(totalMatch);
    return result;
  }
}

function createNameSelector(element) {
  _document = element.ownerDocument;
  var totalMatch = 0;
  if (element.name) {
    var name = element.name;
    name = deleteLineGap(name);

    var cssSelector = element.nodeName.toLowerCase() + "[name='" + name + "']";

    totalMatch = cssSelectorMatchingNode(element, cssSelector);

    var result = [];
    result.push(name);
    result.push(totalMatch);
    return result;
  }
}

function createTagNameSelector(element) {
  _document = element.ownerDocument;
  var totalMatch = 0;
  var tagName = element.nodeName.toLowerCase();

  var tagNameXpath = "//" + tagName;

  var cssSelector = element.nodeName.toLowerCase();

  totalMatch = cssSelectorMatchingNode(element, cssSelector);

  var result = [];
  result.push(tagName);
  result.push(totalMatch);
  return result;
}

function createTestRigorPath(element) {
  var testRigorPath = createSelectorName(element);
  testRigorPath = deleteLineGap(testRigorPath);
  var result = [];
  var totalMatch = 1;
  result.push(`"` + testRigorPath + `"`);
  result.push(totalMatch);
  return result;
}

function createLinkTextSelector(element) {
  _document = element.ownerDocument;
  if (element.nodeName.toLowerCase() === "a" && !elementInShadowDom) {
    //below code will give only parent node text
    var linkText = [].reduce
      .call(
        element.childNodes,
        function (a, b) {
          return a + (b.nodeType === 3 ? b.textContent : "");
        },
        ""
      )
      .trim();
    if (linkText.length !== 0) {
      var xpath = "//a[text()='" + linkText + "']";

      if (linkText.includes("'")) {
        xpath = '//a[text()="' + linkText + '"]';
      }
      var totalMatch = _document.evaluate(
        xpath,
        _document,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      ).snapshotLength;

      var result = [];
      result.push(linkText);
      result.push(totalMatch);
      return result;
    }
  }
}

function createPartialLinkTextSelector(element) {
  _document = element.ownerDocument;
  if (element.nodeName.toLowerCase() === "a" && !elementInShadowDom) {
    // var linkText = element.childNodes[0].nodeValue.trim();
    //below code will give only parent node text
    var linkText = [].reduce
      .call(
        element.childNodes,
        function (a, b) {
          return a + (b.nodeType === 3 ? b.textContent : "");
        },
        ""
      )
      .trim();
    if (linkText.length !== 0) {
      if (linkText.length > 5) {
        //sort the length only if number of characters is more than 5.
        linkText = linkText.slice(0, linkText.length - 2).slice(0, 20); //max length of partial link text 20
      }

      var xpath = "//a[contains(text(),'" + linkText + "')]";

      if (linkText.includes("'")) {
        xpath = '//a[contains(text(),"' + linkText + '")]';
      }
      var totalMatch = _document.evaluate(
        xpath,
        _document,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      ).snapshotLength;

      var result = [];
      result.push(linkText);
      result.push(totalMatch);
      return result;
    }
  }
}

function buildAbsXpath(element) {
  if (element.nodeName.toLowerCase() === "html") return "/html[1]";
  if (element.nodeName.toLowerCase() === "body") return "/html[1]/body[1]";

  var ix = 0;
  var siblings = element.parentNode.childNodes;
  for (var i = 0; i < siblings.length; i++) {
    var sibling = siblings[i];
    if (sibling === element) {
      var absXpath = "";
      absXpath =
        buildAbsXpath(element.parentNode) +
        "/" +
        element.nodeName.toLowerCase() +
        "[" +
        (ix + 1) +
        "]";
      return absXpath;
    }
    if (
      sibling.nodeType === 1 &&
      sibling.nodeName.toLowerCase() === element.nodeName.toLowerCase()
    ) {
      ix++;
    }
  }

  return absXpath;
}

var absXpath = "";
function createAbsXpath(element) {
  var nodeName = element.nodeName.toLowerCase();

  if (nodeName.includes("#comment")) {
    absXpath =
      "This is a comment and selectors can't be generated for comment.";
  } else if (nodeName.includes("<pseudo:")) {
    absXpath =
      "This is a pseudo element and selectors can't be generated for pseudo element.";
    // }else if(nodeName.includes("style")){
    //     absXpath = "This is a "+nodeName+" tag. For "+nodeName+" tag, no need to write xpath. :P";
  } else if (nodeName.includes("#document-fragment")) {
    absXpath =
      "This is a shadow-root and xpath can't be written for it. Please inspect an element.";
  } else if (elementInShadowDom) {
    absXpath =
      "This element is inside Shadow DOM & for such elements XPath won't support.";
    absXpath = shadowDOMOpenOrClosed.includes("closed")
      ? "This element is inside closed Shadow DOM which is inaccessible so for such elements we can't verify/write selectors."
      : absXpath;
  } else {
    absXpath = buildAbsXpath(element);
  }

  var totalMatch = 0;
  if (absXpath.includes("svg")) {
    var beforeSvg = absXpath.split("svg")[0];
    var svgChildTags = absXpath.split("svg")[1].split("/");
    var temp = "";
    for (var j = 0; j < svgChildTags.length; j++) {
      if (j === 0) {
        temp = "*[name()='svg']" + svgChildTags[j];
      } else {
        temp =
          temp +
          "/*[name()='" +
          svgChildTags[j].split("[")[0] +
          "'][" +
          svgChildTags[j].split("[")[1];
      }
    }
    absXpath = beforeSvg + temp;
  }
  try {
    totalMatch = _document.evaluate(
      absXpath,
      _document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    ).snapshotLength;
  } catch (err) {
    totalMatch = 0;
  }

  var result = [];
  result.push(absXpath);
  result.push(totalMatch);
  return result;
}

var tempXpath = "";
var indexes = [];
var matchIndex = [];
var containsFlag = false;

function deleteLineGap(value) {
  if (value) {
    value =
      value.split("\n")[0].length > 0
        ? value.split("\n")[0]
        : value.split("\n")[1];
  }
  return value;
}

var containsText = "";
var equalsText = "";

function deleteGarbageFromInnerText(innerText) {
  innerText = deleteLineGap(innerText);

  //to delete unicode text like arrow icon
  innerText = innerText
    .split(/[^\u0000-\u00ff]/)
    .reduce(function (a, b) {
      return a.length > b.length ? a : b;
    }, "")
    .trim();

  //split the text if it contains / forward slash
  innerText = innerText.split("/")[0].trim();

  return innerText;
}

function isSVGChild(element) {
  var ele = element;
  for (var i = 0; i < 4; i++) {
    if (ele.parentNode) {
      var tagName = ele.parentNode.nodeName.toLowerCase();
      if (tagName === "svg") {
        return true;
      }
      ele = ele.parentNode;
    }
  }
  return false;
}

function getPrecedingSiblings(elem) {
  var sibs = [];
  while ((elem = elem.previousSibling)) {
    if (elem.nodeType === 3 || elem.nodeType === 8) continue; // text node and comment
    sibs.push(elem.nodeName.toLowerCase());
  }
  return sibs;
}

function getFollowingSiblings(elem) {
  var sibs = [];
  while ((elem = elem.nextSibling)) {
    if (elem.nodeType === 3 || elem.nodeType === 8) continue; // text node and comment
    sibs.push(elem.nodeName.toLowerCase());
  }
  return sibs;
}

function getAllSiblings(elem) {
  var sibs = [];
  elem = elem.parentNode.firstChild;
  do {
    if (elem.nodeType === 3 || elem.nodeType === 8) continue; // text node and comment
    sibs.push(elem.nodeName.toLowerCase());
  } while ((elem = elem.nextSibling));
  return sibs;
}

function getAllAncestors(elem) {
  var ancestors = [];
  while (
    elem.parentNode &&
    elem.parentNode.nodeName.toLowerCase() != "#document" &&
    elem.parentNode.nodeName.toLowerCase() != "html"
  ) {
    if (elem.parentNode === 3 || elem.parentNode === 8) continue; // text node and comment
    elem = elem.parentNode;
    ancestors.push(elem.nodeName.toLowerCase());
  }
  return ancestors;
}

function getAllDescendants(elem) {
  var descendants = elem.getElementsByTagName("*");
  var descendantsTags = [];
  for (var i = 0; i < descendants.length; i++) {
    if (descendants[i].nodeType != 3 && descendants[i].nodeType != 8) {
      // text node and comment)
      descendantsTags.push(descendants[i].nodeName.toLowerCase());
    }
  }
  return descendantsTags;
}

function getAllChildren(elem) {
  var children = elem.children;
  var childrenTags = [];
  for (var i = 0; i < children.length; i++) {
    if (children[i].nodeType != 3 && children[i].nodeType != 8) {
      // text node and comment)
      childrenTags.push(children[i].nodeName.toLowerCase());
    }
  }
  return childrenTags;
}

function containsNewLineBlankSpaceStartEnd(value) {
  if (
    /\r|\n/.exec(value) ||
    value.charAt(0) == " " ||
    value.charAt(value.length - 1) == " "
  ) {
    return true;
  } else {
    return false;
  }
}

function placeZerosAtEnd(arr) {
  return arr.filter(isntZero).concat(arr.filter(isZero));
}
function isntZero(element) {
  if (element.charAt(0) == "a") {
    return true;
  } else {
    return element.charAt(0) > 0;
  }
}
function isZero(element) {
  return element.charAt(0) == 0;
}

var listOfTextAndAttr = [];
var xpathListOfTextAndAttr = [];
var cssListOfTextAndAttr = [];

var hubMode = "";
var absXpathForInspected = "";
function prepareListOfAttrText(element) {
  if (!isFirefox) {
    _document = element.ownerDocument;
    inspectedElement = element;
    elementInShadowDom = isInShadow(element);
    iframeOfFrame(element);
  }

  listOfTextAndAttr = [];
  xpathListOfTextAndAttr = [];
  cssListOfTextAndAttr = [];

  listOfTextAndAttr.push("z$*[shub]"); //random value to recevie
  var attr = "";
  var attrValue = "";
  var innerTextWithTrim = "";
  var innerTextWithoutTrim = "";
  var textContent = "";
  var svgTag = "";
  var tagName = element.nodeName.toLowerCase();

  try {
    innerTextWithTrim = [].reduce
      .call(
        element.childNodes,
        function (a, b) {
          return a + (b.nodeType === 3 ? b.textContent : "");
        },
        ""
      )
      .trim();
    innerTextWithoutTrim = [].reduce.call(
      element.childNodes,
      function (a, b) {
        return a + (b.nodeType === 3 ? b.textContent : "");
      },
      ""
    );

    textContent = element.innerText.trim();
    textContent = deleteLineGap(textContent);

    textContent = innerTextWithTrim != textContent ? textContent : "";
  } catch (err) {}
  if (!elementInShadowDom) {
    if (tagName.includes("svg") || isSVGChild(element)) {
      svgTag = "//*[local-name()='" + tagName + "']";
      xpathListOfTextAndAttr.push(svgTag);
      var svgTag1 = "//*[name()='" + tagName + "']";
      xpathListOfTextAndAttr.push(svgTag1);
    } else {
      xpathListOfTextAndAttr.push("//" + tagName);
    }
    //innerText = deleteGarbageFromInnerText(innerText);

    if (textContent) {
      if (textContent.includes("'") || textContent.includes("’")) {
        //if(!containsNewLineBlankSpaceStartEnd(innerTextWithoutTrim)){
        xpathListOfTextAndAttr.push('[text()="' + textContent + '"]');
        xpathListOfTextAndAttr.push(
          '[starts-with(text(),"' + textContent + '")]'
        );
        xpathListOfTextAndAttr.push('[.="' + textContent + '"]');
        //}
        xpathListOfTextAndAttr.push('[contains(text(),"' + textContent + '")]');
        xpathListOfTextAndAttr.push('[contains(.,"' + textContent + '")]');
      } else {
        //if(!containsNewLineBlankSpaceStartEnd(innerTextWithoutTrim)){
        xpathListOfTextAndAttr.push("[text()='" + textContent + "']");
        xpathListOfTextAndAttr.push(
          "[starts-with(text(),'" + textContent + "')]"
        );
        xpathListOfTextAndAttr.push("[.='" + textContent + "']");
        //}
        xpathListOfTextAndAttr.push("[contains(text(),'" + textContent + "')]");
        xpathListOfTextAndAttr.push("[contains(.,'" + textContent + "')]");
      }
    }

    if (innerTextWithTrim) {
      if (!isNaN(innerTextWithTrim)) {
        xpathListOfTextAndAttr.push("[text()=" + innerTextWithoutTrim + "]");
      }
      innerTextWithoutTrim =
        innerTextWithoutTrim.indexOf("\n") == 0
          ? innerTextWithTrim
          : innerTextWithoutTrim;
      if (innerTextWithTrim.includes("'") || innerTextWithTrim.includes("’")) {
        //if(!containsNewLineBlankSpaceStartEnd(innerTextWithoutTrim)){
        xpathListOfTextAndAttr.push('[text()="' + innerTextWithoutTrim + '"]');
        xpathListOfTextAndAttr.push(
          '[starts-with(text(),"' + innerTextWithoutTrim + '")]'
        );
        xpathListOfTextAndAttr.push('[.="' + innerTextWithoutTrim + '"]');

        //}
        xpathListOfTextAndAttr.push(
          '[contains(text(),"' + innerTextWithTrim + '")]'
        );
        xpathListOfTextAndAttr.push(
          '[contains(.,"' + innerTextWithTrim + '")]'
        );
        xpathListOfTextAndAttr.push(
          '[normalize-space()="' + innerTextWithTrim + '"]'
        );
        xpathListOfTextAndAttr.push(
          'normalize-space()="' + innerTextWithTrim + '"]'
        );
        xpathListOfTextAndAttr.push(
          '[contains(normalize-space(),"' + innerTextWithTrim + '")]'
        );
        xpathListOfTextAndAttr.push(
          'contains(normalize-space(),"' + innerTextWithTrim + '")]'
        );
        xpathListOfTextAndAttr.push(
          '[substring-after(text(),"' +
            innerTextWithTrim.substr(0, innerTextWithTrim.length - 1) +
            '")]'
        );
        xpathListOfTextAndAttr.push(
          '[substring-before(text(),"' + innerTextWithTrim.substr(1) + '")]'
        );
      } else {
        //if(!containsNewLineBlankSpaceStartEnd(innerTextWithoutTrim)){
        xpathListOfTextAndAttr.push("[text()='" + innerTextWithoutTrim + "']");
        xpathListOfTextAndAttr.push(
          "[starts-with(text(),'" + innerTextWithoutTrim + "')]"
        );
        xpathListOfTextAndAttr.push("[.='" + innerTextWithoutTrim + "']");
        //}
        xpathListOfTextAndAttr.push(
          "[contains(text(),'" + innerTextWithTrim + "')]"
        );
        xpathListOfTextAndAttr.push(
          "[contains(.,'" + innerTextWithTrim + "')]"
        );
        xpathListOfTextAndAttr.push(
          "[normalize-space()='" + innerTextWithTrim + "']"
        );
        xpathListOfTextAndAttr.push(
          "normalize-space()='" + innerTextWithTrim + "']"
        );
        xpathListOfTextAndAttr.push(
          "[contains(normalize-space(),'" + innerTextWithTrim + "')]"
        );
        xpathListOfTextAndAttr.push(
          "contains(normalize-space(),'" + innerTextWithTrim + "')]"
        );
        xpathListOfTextAndAttr.push(
          "[substring-after(text(),'" +
            innerTextWithTrim.substr(0, innerTextWithTrim.length - 1) +
            "')]"
        );
        xpathListOfTextAndAttr.push(
          "[substring-before(text(),'" + innerTextWithTrim.substr(1) + "')]"
        );
      }
    }
    xpathListOfTextAndAttr.push("text()");
  }

  //add just tagname for cssSelector
  cssListOfTextAndAttr.push(tagName);

  if (element.attributes.length != 0) {
    if (!attrValue) {
      for (var i = 0; i < element.attributes.length; i++) {
        attr = element.attributes[i].name;
        attrValue = element.attributes[i].nodeValue;
        if (
          attrValue != null &&
          attrValue != "" &&
          attr !== "shub-ins" &&
          attr !== "sh-att" &&
          attr !== "xpath" &&
          attr !== "xpathtest" &&
          attr !== "xpathtest" &&
          attr !== "onclick" &&
          !listOfTextAndAttr.includes(attr)
        ) {
          if (attrValue.includes("'") || attrValue.includes("’")) {
            //if(!containsNewLineBlankSpaceStartEnd(attrValue)){
            cssListOfTextAndAttr.push("[" + attr + '="' + attrValue + '"]');
            cssListOfTextAndAttr.push("[" + attr + '$="' + attrValue + '"]');
            cssListOfTextAndAttr.push("[" + attr + '^="' + attrValue + '"]');
            cssListOfTextAndAttr.push("[" + attr + '*="' + attrValue + '"]');

            if (!elementInShadowDom) {
              xpathListOfTextAndAttr.push(
                "[@" + attr + '="' + attrValue + '"]'
              );
              xpathListOfTextAndAttr.push("@" + attr + '="' + attrValue + '"]');
            }
            //}
            if (!elementInShadowDom) {
              xpathListOfTextAndAttr.push(
                "[contains(@" + attr + ',"' + attrValue.trim() + '")]'
              );
            }
          } else {
            //if(!containsNewLineBlankSpaceStartEnd(attrValue)){
            cssListOfTextAndAttr.push("[" + attr + "='" + attrValue + "']");
            cssListOfTextAndAttr.push("[" + attr + "$='" + attrValue + "']");
            cssListOfTextAndAttr.push("[" + attr + "^='" + attrValue + "']");
            cssListOfTextAndAttr.push("[" + attr + "*='" + attrValue + "']");
            if (!elementInShadowDom) {
              xpathListOfTextAndAttr.push(
                "[@" + attr + "='" + attrValue + "']"
              );
              xpathListOfTextAndAttr.push("@" + attr + "='" + attrValue + "']");
            }
            //}
            if (!elementInShadowDom) {
              xpathListOfTextAndAttr.push(
                "[contains(@" + attr + ",'" + attrValue.trim() + "')]"
              );
            }
          }
          xpathListOfTextAndAttr.push("@" + attr);
          if (attr == "class") {
            cssListOfTextAndAttr.push("." + attrValue.split(" ").join("."));
          } else if (attr == "id") {
            cssListOfTextAndAttr.push("#" + attrValue);
          }
        }
      }
    }
  }

  if (xpathListOfTextAndAttr) {
    var j = 1;
    absXpathForInspected = createAbsXpath(element)[0];

    var pos = absXpathForInspected
      .split("[")
      [absXpathForInspected.split("[").length - 1].split("]")[0];
    xpathListOfTextAndAttr.push("[position()=" + pos + "]");
    xpathListOfTextAndAttr.push("[last()]");
    var i = svgTag ? 2 : 1;
    for (; i < xpathListOfTextAndAttr.length; i++) {
      var totalMatch = 0;
      try {
        var tagFormat = svgTag ? svgTag : "//" + tagName;
        if (
          xpathListOfTextAndAttr[i].charAt(0) != "[" &&
          xpathListOfTextAndAttr[i].charAt(xpathListOfTextAndAttr.length - 1) ==
            "]"
        ) {
          totalMatch = _document.evaluate(
            tagFormat + "[" + xpathListOfTextAndAttr[i],
            _document,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
          ).snapshotLength;
        } else if (
          xpathListOfTextAndAttr[i].charAt(0) != "[" &&
          xpathListOfTextAndAttr[i].charAt(xpathListOfTextAndAttr.length - 1) !=
            "]"
        ) {
          totalMatch = _document.evaluate(
            tagFormat + "/" + xpathListOfTextAndAttr[i],
            _document,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
          ).snapshotLength;
          totalMatch = "abc";
        } else {
          totalMatch = _document.evaluate(
            tagFormat + xpathListOfTextAndAttr[i],
            _document,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
          ).snapshotLength;
        }
        xpathListOfTextAndAttr[i] =
          totalMatch + "-sanjayMatchingNode-" + xpathListOfTextAndAttr[i];
      } catch (err) {}
    }
    totalMatch = _document.evaluate(
      tagFormat,
      _document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    ).snapshotLength;
    xpathListOfTextAndAttr[0] =
      totalMatch + "-sanjayMatchingNode-" + xpathListOfTextAndAttr[0];
    if (svgTag) {
      xpathListOfTextAndAttr[1] =
        totalMatch + "-sanjayMatchingNode-" + xpathListOfTextAndAttr[1];
    }
  }

  if (cssListOfTextAndAttr) {
    for (var i = 1; i < cssListOfTextAndAttr.length; i++) {
      var totalMatch = 0;

      try {
        if (
          cssListOfTextAndAttr[i].charAt(0) == "." ||
          cssListOfTextAndAttr[i].charAt(0) == "#"
        ) {
          totalMatch = cssSelectorMatchingNode(
            element,
            cssListOfTextAndAttr[i]
          );
        } else {
          totalMatch = cssSelectorMatchingNode(
            element,
            tagName + cssListOfTextAndAttr[i]
          );
        }
        cssListOfTextAndAttr[i] =
          totalMatch + "-sanjayMatchingNode-" + cssListOfTextAndAttr[i];
      } catch (err) {}
    }
    totalMatch = cssSelectorMatchingNode(element, cssListOfTextAndAttr[0]);
    cssListOfTextAndAttr[0] =
      totalMatch + "-sanjayMatchingNode-" + cssListOfTextAndAttr[0];
  }

  xpathListOfTextAndAttr.sort();
  cssListOfTextAndAttr.sort();

  xpathListOfTextAndAttr = placeZerosAtEnd(xpathListOfTextAndAttr);
  cssListOfTextAndAttr = placeZerosAtEnd(cssListOfTextAndAttr);

  // if(!elementInShadowDom){
  var precedingSiblings = [];
  var followingSiblings = [];
  var parent = "";
  var children = [];
  var ancestors = [];
  var descendants = [];

  cssListOfTextAndAttr.push("abc-sanjayMatchingNode-:first-child");
  cssListOfTextAndAttr.push("abc-sanjayMatchingNode-:last-child");
  cssListOfTextAndAttr.push("abc-sanjayMatchingNode-:nth-child()");
  cssListOfTextAndAttr.push("abc-sanjayMatchingNode-:nth-last-child()");
  cssListOfTextAndAttr.push("abc-sanjayMatchingNode-:first-of-type");
  cssListOfTextAndAttr.push("abc-sanjayMatchingNode-:last-of-type");
  cssListOfTextAndAttr.push("abc-sanjayMatchingNode-:nth-of-type()");
  cssListOfTextAndAttr.push("abc-sanjayMatchingNode-:nth-last-of-type()");

  xpathListOfTextAndAttr.push("abc-sanjayMatchingNode-sibling::");
  xpathListOfTextAndAttr.push("abc-sanjayMatchingNode-contains()");
  xpathListOfTextAndAttr.push("abc-sanjayMatchingNode-starts-with");
  xpathListOfTextAndAttr.push("abc-sanjayMatchingNode-substring-before");
  xpathListOfTextAndAttr.push("abc-sanjayMatchingNode-substring-after");

  precedingSiblings = getPrecedingSiblings(element);
  if (precedingSiblings.length > 0) {
    xpathListOfTextAndAttr.push("abc-sanjayMatchingNode-preceding::");
    xpathListOfTextAndAttr.push("abc-sanjayMatchingNode-preceding-sibling::");
    xpathListOfTextAndAttr.push("abc-sanjayMatchingNode-]/preceding-sibling::");
  }
  for (var i = 0; i < precedingSiblings.length; i++) {
    if (
      !xpathListOfTextAndAttr.includes(
        "abc-sanjayMatchingNode-preceding-sibling::" + precedingSiblings[i]
      )
    ) {
      xpathListOfTextAndAttr.push(
        "abc-sanjayMatchingNode-preceding-sibling::" + precedingSiblings[i]
      );
    }
  }

  followingSiblings = getFollowingSiblings(element);
  if (followingSiblings.length > 0) {
    xpathListOfTextAndAttr.push("abc-sanjayMatchingNode-following::");
    xpathListOfTextAndAttr.push("abc-sanjayMatchingNode-following-sibling::");
    xpathListOfTextAndAttr.push("abc-sanjayMatchingNode-]/following-sibling::");
  }
  for (var i = 0; i < followingSiblings.length; i++) {
    if (i == 0) {
      cssListOfTextAndAttr.push(
        "abc-sanjayMatchingNode- + " + followingSiblings[i]
      ); //for adjencant sibling
    }

    if (
      !xpathListOfTextAndAttr.includes(
        "abc-sanjayMatchingNode-following-sibling::" + followingSiblings[i]
      ) &&
      !cssListOfTextAndAttr.includes(
        "abc-sanjayMatchingNode- ~ " + followingSiblings[i]
      )
    ) {
      cssListOfTextAndAttr.push(
        "abc-sanjayMatchingNode- ~ " + followingSiblings[i]
      );
      xpathListOfTextAndAttr.push(
        "abc-sanjayMatchingNode-following-sibling::" + followingSiblings[i]
      );
    }
  }

  if (element.parentNode) {
    xpathListOfTextAndAttr.push("abc-sanjayMatchingNode-]/..");
    xpathListOfTextAndAttr.push("abc-sanjayMatchingNode-parent::");
    xpathListOfTextAndAttr.push("abc-sanjayMatchingNode-]/parent::");
    xpathListOfTextAndAttr.push(
      "abc-sanjayMatchingNode-parent::" +
        element.parentNode.nodeName.toLowerCase()
    );
  }

  children = getAllChildren(element);
  if (children.length > 0) {
    xpathListOfTextAndAttr.push("abc-sanjayMatchingNode-child::");
    xpathListOfTextAndAttr.push("abc-sanjayMatchingNode-]/child::");
  }
  for (var i = 0; i < children.length; i++) {
    if (
      !xpathListOfTextAndAttr.includes(
        "abc-sanjayMatchingNode-child::" + children[i]
      ) &&
      !cssListOfTextAndAttr.includes("abc-sanjayMatchingNode- > " + children[i])
    ) {
      cssListOfTextAndAttr.push("abc-sanjayMatchingNode- > " + children[i]);
      xpathListOfTextAndAttr.push(
        "abc-sanjayMatchingNode-child::" + children[i]
      );
    }
  }

  ancestors = getAllAncestors(element);
  if (ancestors.length > 0) {
    xpathListOfTextAndAttr.push("abc-sanjayMatchingNode-ancestor::");
    xpathListOfTextAndAttr.push("abc-sanjayMatchingNode-]/ancestor::");
  }
  for (var i = 0; i < ancestors.length; i++) {
    if (
      !xpathListOfTextAndAttr.includes(
        "abc-sanjayMatchingNode-ancestor::" + ancestors[i]
      )
    ) {
      xpathListOfTextAndAttr.push(
        "abc-sanjayMatchingNode-ancestor::" + ancestors[i]
      );
    }
  }

  descendants = getAllDescendants(element);
  if (descendants.length > 0) {
    xpathListOfTextAndAttr.push("abc-sanjayMatchingNode-]/descendant::");
    xpathListOfTextAndAttr.push("abc-sanjayMatchingNode-descendant::");
  }
  for (var i = 0; i < descendants.length; i++) {
    if (
      !xpathListOfTextAndAttr.includes(
        "abc-sanjayMatchingNode-descendant::" + descendants[i]
      ) &&
      !cssListOfTextAndAttr.includes(
        "abc-sanjayMatchingNode- " + descendants[i]
      )
    ) {
      cssListOfTextAndAttr.push("abc-sanjayMatchingNode- " + descendants[i]);
      xpathListOfTextAndAttr.push(
        "abc-sanjayMatchingNode-descendant::" + descendants[i]
      );
    }
  }
  // }

  // xpathListOfTextAndAttr.push("abc-sanjayMatchingNode-/../preceding-sibling::");
  // xpathListOfTextAndAttr.push("abc-sanjayMatchingNode-/../following-sibling::");
  // xpathListOfTextAndAttr.push("abc-sanjayMatchingNode-/../parent::");
  // xpathListOfTextAndAttr.push("abc-sanjayMatchingNode-/../child::");
  // xpathListOfTextAndAttr.push("abc-sanjayMatchingNode-/../ancestor::");
  // xpathListOfTextAndAttr.push("abc-sanjayMatchingNode-/../descendant::");

  listOfTextAndAttr.push(xpathListOfTextAndAttr);
  listOfTextAndAttr.push(cssListOfTextAndAttr);

  // var elementType = " ";
  // if(_document !== document) {
  //     //chrome.runtime.sendMessage({ count: frameOriframe });
  //     elementType = frameOriframe;
  // }else if (tagName.includes('svg') || isSVGChild(element)) {
  //     //chrome.runtime.sendMessage({ count: "svgelement" });
  //     elementType = "svgelement";
  // }else{
  //     if(elementInShadowDom){
  //         //chrome.runtime.sendMessage({ count: "shadowdom" });
  //         elementType = "shadowdom";
  //     }else{
  //         //chrome.runtime.sendMessage({ count: "notIframe" });
  //         elementType = "notIframe";
  //     }
  // }

  // listOfTextAndAttr.push(elementType);

  // var elementInfo = " ";
  // if(element.offsetWidth<2 || element.offsetHeight<2 || element.style.visibility === "hidden" || element.style.visibility === "none" || element.tagName.toLowerCase() === 'script' || element.tagName.toLowerCase() === 'style') {
  //     // var elementInfo = "it is not visible in UI.";
  //     elementInfo = 'Alert: This element is not interactable through selenium(automation) as it is not visible in UI. Try any near by element.<a class="training" href="https://bit.ly/sh_courses_recordings" target="_blank"> Learn more...</a>';
  //     elementInfo = "elementInfo-"+elementInfo;
  //     //chrome.runtime.sendMessage({ count: "elementInfo-"+elementInfo});
  // }

  // if(element.tagName.toLowerCase() === 'input' && element.disabled) {
  //     elementInfo = "Alert: Input box is disabled, enable it to enter value.";
  //     elementInfo = "elementInfo-"+elementInfo;
  //     //chrome.runtime.sendMessage({ count: "elementInfo-"+elementInfo});
  // }

  // listOfTextAndAttr.push(elementInfo);

  if (isFirefox) {
    chrome.runtime.sendMessage({
      count: listOfTextAndAttr,
    });
  } else {
    return listOfTextAndAttr;
  }

  listOfTextAndAttr = [];
  xpathListOfTextAndAttr = [];
  cssListOfTextAndAttr = [];
}

var listOfAttr = {};

function getListOfAttr(element) {
  var userAttr = chooseAttrsForXpath[0];
  var attr = "";
  var attrValue = "";

  for (var i = 0; i < element.attributes.length; i++) {
    attr = element.attributes[i].name;
    attrValue = element.attributes[i].nodeValue;
    if (
      attrValue != null &&
      attrValue != "" &&
      (attr !== "style" || userAttr === "style") &&
      attr !== "id" &&
      attr !== "shub-ins" &&
      attr !== "sh-att" &&
      attr !== "xpath" &&
      attr !== "xpathtest" &&
      (!chooseAttrsForXpath.includes("without" + attr) || userAttr == attr)
    ) {
      listOfAttr[attr] = attrValue;
    }
  }

  return listOfAttr;
}

function buildRelXpath(_document, element) {
  var userAttr = chooseAttrsForXpath[0];
  var doubleSpaceOrJunk = false;
  var tagName = element.nodeName.toLowerCase();

  //this will give only parent text, not the child node text
  var innerText = tagName.includes("body")
    ? ""
    : [].reduce
        .call(
          element.childNodes,
          function (a, b) {
            return a + (b.nodeType === 3 ? b.textContent : "");
          },
          ""
        )
        .trim();

  if (
    innerText.includes("  ") ||
    innerText.includes("\n") ||
    innerText.match(/[^\u0000-\u00ff]/)
  ) {
    doubleSpaceOrJunk = true;
  }
  if (innerText.includes("  ") || innerText.includes("\n")) {
    innerText = deleteGarbageFromInnerText(innerText);
  }

  if (tagName.includes("svg")) {
    tagName = "*";
  }

  innerText = innerText.includes("'") ? innerText.split("'")[0] : innerText;

  if (innerText.includes("'")) {
    innerText = innerText.split("  ")[0];
    dotText = '[contains(.,"' + innerText + '")]';
    equalsText = '[normalize-space()="' + innerText + '"]';

    if (innerText.length > 50 || doubleSpaceOrJunk) {
      containsText = '[contains(text(),"' + innerText.slice(0, 50) + '")]';
      equalsText = containsText;
    } else {
      containsText = '[normalize-space()="' + innerText + '"]';
      equalsText = containsText;
    }
  } else {
    innerText = innerText.split("  ")[0];
    dotText = "[contains(.,'" + innerText + "')]";
    equalsText = "[normalize-space()='" + innerText + "']";

    if (innerText.length > 50 || doubleSpaceOrJunk) {
      containsText = "[contains(text(),'" + innerText.slice(0, 50) + "')]";
      equalsText = containsText;
    } else {
      containsText = "[normalize-space()='" + innerText + "']";
      equalsText = containsText;
    }
  }

  if (
    (chooseAttrsForXpath.includes("withouttext") &&
      userAttr.toLowerCase() != "text") ||
    generateCssSelectorFlag
  ) {
    innerText = "";
  }

  if (
    innerText &&
    (tagName == "a" ||
      tagName == "button" ||
      tagName == "label" ||
      tagName.charAt(0) == "h") &&
    element.id == "" &&
    userAttr.toLowerCase() == ""
  ) {
    var equalsXpath = "//" + tagName + equalsText;
    var totalMatch = _document.evaluate(
      equalsXpath,
      _document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    ).snapshotLength;
    if (totalMatch === 1) {
      var dotXpath = "//" + tagName + dotText;
      var totalMatch = _document.evaluate(
        dotXpath,
        _document,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      ).snapshotLength;
      if (totalMatch === 1) {
        return equalsXpath;
      } else {
        var firstText = element.firstChild.textContent;
        firstText = deleteGarbageFromInnerText(firstText);
        var containsfirstText = "[normalize-space()='" + firstText + "']";
        var containsfirstXpath = "//" + tagName + containsfirstText;
        totalMatch = _document.evaluate(
          containsfirstXpath,
          _document,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
        ).snapshotLength;
        if (totalMatch === 1) {
          return containsfirstXpath;
        }
      }
    }
  }

  if (tagName.includes("html") || tagName.includes("body")) {
    return "//" + tagName + tempXpath;
  }
  var attr = "";
  var attrValue = "";
  var listOfAttr = {};

  if (!attrValue) {
    for (var i = 0; i < element.attributes.length; i++) {
      var tempAttr = element.attributes[i].name;
      var tempAttrValue = element.attributes[i].nodeValue;
      // if (attrValue!=null && attrValue!="" && !attr.includes("style") && !attr.includes("id") && !attr.includes("xpath")  && (chooseAttrsForXpath.includes("with"+attr) || userAttr==attr)){
      if (
        tempAttrValue != null &&
        tempAttrValue != "" &&
        (tempAttr !== "style" || userAttr === "style") &&
        tempAttr !== "id" &&
        tempAttr !== "xpath" &&
        tempAttr !== "xpathtest" &&
        (!chooseAttrsForXpath.includes("without" + tempAttr) ||
          userAttr == tempAttr)
      ) {
        listOfAttr[tempAttr] = tempAttrValue;
      }
    }
  }
  var noOfUsefulAttr = Object.keys(listOfAttr).length;

  if (
    (!element.getAttribute(userAttr) || userAttr.toLowerCase() === "id") &&
    element.id !== "" &&
    (chooseAttrsForXpath.includes("withid") || userAttr.toLowerCase() === "id")
  ) {
    var id = element.id;
    id = deleteLineGap(id);
    if(id.includes("[")){
      tempXpath = "//" + tagName + "[contains(@id,'" + id.split('[')[0] + "')]" + tempXpath;
    }else{
      tempXpath = "//" + tagName + "[@id='" + id + "']" + tempXpath;  
    }
    
    var totalMatch = _document.evaluate(
      tempXpath,
      _document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    ).snapshotLength;
    if (totalMatch === 1) {
      return tempXpath;
    } else {
      if (innerText && element.getElementsByTagName("*").length === 0) {
        var containsXpath = "//" + tagName + containsText + tempXpath;
        var totalMatch = _document.evaluate(
          containsXpath,
          _document,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
        ).snapshotLength;
        if (totalMatch === 0) {
          var equalsXpath = "//" + tagName + equalsText + tempXpath;
          var totalMatch = _document.evaluate(
            equalsXpath,
            _document,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
          ).snapshotLength;
          if (totalMatch === 1) {
            return equalsXpath;
          } else {
            tempXpath = tempXpath;
          }
        } else if (totalMatch === 1) {
          return containsXpath;
        } else {
          tempXpath = tempXpath;
        }
      } else {
        tempXpath = tempXpath;
      }
    }
  } else if (noOfUsefulAttr != 0) {
    // if (!attrValue) {
    //     for (var i = 0; i < element.attributes.length; i++) {
    //         attr = element.attributes[i].name;
    //         attrValue = element.attributes[i].nodeValue;
    //         // if (attrValue!=null && attrValue!="" && !attr.includes("style") && !attr.includes("id") && !attr.includes("xpath")  && (chooseAttrsForXpath.includes("with"+attr) || userAttr==attr)){
    //         if (attrValue != null && attrValue != "" && (attr !== "style" || userAttr === "style") && attr !== "id" && attr !== "xpath" && attr !== "xpathtest" && (!chooseAttrsForXpath.includes("without" + attr) || userAttr == attr)) {
    //             listOfAttr[attr] = attrValue;
    //         }
    //     }
    // }

    var attrTempXpath = "";
    var attrTempXpath0 = "";
    for (var j = 0; j < noOfUsefulAttr; j++) {
      attrTempXpath = tempXpath;
      if (userAttr in listOfAttr) {
        attr = userAttr;
        attrValue = listOfAttr[attr];
      } else if ("placeholder" in listOfAttr) {
        attr = "placeholder";
        attrValue = listOfAttr[attr];
      } else if ("title" in listOfAttr) {
        attr = "title";
        attrValue = listOfAttr[attr];
      } else if ("name" in listOfAttr) {
        attr = "name";
        attrValue = listOfAttr[attr];
      } else if ("value" in listOfAttr) {
        attr = "value";
        attrValue = listOfAttr[attr];
      } else if ("aria-label" in listOfAttr) {
        attr = "aria-label";
        attrValue = listOfAttr[attr];
      } else if ("alt" in listOfAttr) {
        attr = "alt";
        attrValue = listOfAttr[attr];
      } else if ("for" in listOfAttr) {
        attr = "for";
        attrValue = listOfAttr[attr];
      } else if ("data-label" in listOfAttr) {
        attr = "data-label";
        attrValue = listOfAttr[attr];
      } else if ("date-fieldlabel" in listOfAttr) {
        attr = "date-fieldlabel";
        attrValue = listOfAttr[attr];
      } else if ("data-displaylabel" in listOfAttr) {
        attr = "data-displaylabel";
        attrValue = listOfAttr[attr];
      } else if ("role" in listOfAttr) {
        attr = "role";
        attrValue = listOfAttr[attr];
      } else if ("type" in listOfAttr) {
        attr = "type";
        attrValue = listOfAttr[attr];
      } else if ("class" in listOfAttr) {
        attr = "class";
        attrValue = listOfAttr[attr];
      } else {
        attr = Object.keys(listOfAttr)[0];
        attrValue = listOfAttr[attr];
        if (isAlphaNumeric(attrValue)) {
          attr = "";
          attrValue = "";
        }
      }
      attrValue = deleteLineGap(attrValue); //sometime there is linespace in value so taking value before linespace.
      delete listOfAttr[attr];
      if (attrValue != null && attrValue != "" && attr !== "shub-ins" &&
      attr !== "sh-att" && attr !== "xpath") {
        var xpathWithoutAttribute = "//" + tagName;
        var xpathWithAttributeWithoutTemp = "";
        var xpathWithAttributeWithTemp = "";

        if (attrValue.includes("  ")) {
          attrValue = attrValue.split("  ")[attrValue.split("  ").length - 1];
          containsFlag = true;
        }
        if (attrValue.includes("'")) {
          if (
            (attrValue.charAt(0) === " " ||
              attrValue.charAt(attrValue.length - 1) === " " ||
              containsFlag) &&
            !xpathForCss
          ) {
            xpathWithAttributeWithoutTemp =
              "//" +
              tagName +
              "[contains(@" +
              attr +
              ',"' +
              attrValue.trim() +
              '")]';
          } else {
            xpathWithAttributeWithoutTemp =
              "//" + tagName + "[@" + attr + '="' + attrValue + '"]';
          }
        } else {
          if (
            (attrValue.charAt(0) === " " ||
              attrValue.charAt(attrValue.length - 1) === " " ||
              containsFlag) &&
            !xpathForCss
          ) {
            xpathWithAttributeWithoutTemp =
              "//" +
              tagName +
              "[contains(@" +
              attr +
              ",'" +
              attrValue.trim() +
              "')]";
          } else {
            xpathWithAttributeWithoutTemp =
              "//" + tagName + "[@" + attr + "='" + attrValue + "']";
          }
        }
        xpathWithAttributeWithTemp =
          xpathWithAttributeWithoutTemp + attrTempXpath;

        var totalMatch = _document.evaluate(
          xpathWithAttributeWithTemp,
          _document,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
        ).snapshotLength;
        if (totalMatch === 1) {
          if (
            (xpathWithAttributeWithTemp.includes("@href") &&
              !userAttr.includes("href")) ||
            (xpathWithAttributeWithTemp.includes("@src") &&
              !userAttr.includes("src") &&
              innerText)
          ) {
            var containsXpath = "//" + tagName + containsText + attrTempXpath;
            var totalMatch = _document.evaluate(
              containsXpath,
              _document,
              null,
              XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
              null
            ).snapshotLength;
            if (totalMatch === 0) {
              var equalsXpath = "//" + tagName + equalsText + attrTempXpath;
              var totalMatch = _document.evaluate(
                equalsXpath,
                _document,
                null,
                XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                null
              ).snapshotLength;
              if (totalMatch === 1) {
                return equalsXpath;
              }
            } else if (totalMatch === 1) {
              return containsXpath;
            }
          }
          return xpathWithAttributeWithTemp;
          // }else if(innerText && element.getElementsByTagName('*').length===0){
          //this element.getElementsByTagName('*').length===0 check not required because innertext has only parent text.
        } else if (innerText) {
          var containsXpath = "//" + tagName + containsText + attrTempXpath;
          var totalMatch = _document.evaluate(
            containsXpath,
            _document,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
          ).snapshotLength;
          if (totalMatch === 0) {
            var equalsXpath = "//" + tagName + equalsText + attrTempXpath;
            var totalMatch = _document.evaluate(
              equalsXpath,
              _document,
              null,
              XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
              null
            ).snapshotLength;
            if (totalMatch === 1) {
              return equalsXpath;
            } else if (totalMatch > 1) {
              attrTempXpath = equalsXpath; //fix when contains text has comment too, like in react app
            } else if (totalMatch === 0) {
              attrTempXpath = xpathWithAttributeWithTemp;
            }
          } else if (totalMatch === 1) {
            var dotXpath = "//" + tagName + dotText + attrTempXpath;
            var totalMatch = _document.evaluate(
              dotXpath,
              _document,
              null,
              XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
              null
            ).snapshotLength;
            if (totalMatch === 1) {
              return containsXpath;
            } else {
              var firstText = element.firstChild.textContent;
              firstText = deleteGarbageFromInnerText(firstText);
              var containsfirstText = "[normalize-space()='" + firstText + "']";
              var containsfirstXpathWithoutAttr =
                "//" + tagName + containsfirstText + attrTempXpath;
              totalMatch = _document.evaluate(
                containsfirstXpathWithoutAttr,
                _document,
                null,
                XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                null
              ).snapshotLength;
              if (totalMatch === 1) {
                return containsfirstXpathWithoutAttr;
              } else {
                var containsfirstXpath =
                  xpathWithAttributeWithoutTemp +
                  containsfirstText +
                  attrTempXpath;
                totalMatch = _document.evaluate(
                  containsfirstXpath,
                  _document,
                  null,
                  XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                  null
                ).snapshotLength;
                if (totalMatch === 1) {
                  return containsfirstXpath;
                } else {
                  attrTempXpath = containsfirstXpath;
                }
              }
            }
          } else {
            containsXpath =
              "//" +
              tagName +
              "[contains(text(),'" +
              innerText.slice(0, 50) +
              "')]" +
              attrTempXpath;
            totalMatch = _document.evaluate(
              containsXpath,
              _document,
              null,
              XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
              null
            ).snapshotLength;
            if (totalMatch === 1) {
              return containsXpath;
            } else {
              containsXpath =
                xpathWithAttributeWithoutTemp + containsText + attrTempXpath;
              totalMatch = _document.evaluate(
                containsXpath,
                _document,
                null,
                XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                null
              ).snapshotLength;
              if (totalMatch === 0) {
                var equalsXpath =
                  xpathWithAttributeWithoutTemp + equalsText + attrTempXpath;
                var totalMatch = _document.evaluate(
                  equalsXpath,
                  _document,
                  null,
                  XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                  null
                ).snapshotLength;
                if (totalMatch === 1) {
                  return equalsXpath;
                }
              } else if (totalMatch === 1) {
                return containsXpath;
              } else if (attrValue.includes("/") || innerText.includes("/")) {
                if (attrValue.includes("/")) {
                  containsXpath =
                    xpathWithoutAttribute + containsText + attrTempXpath;
                }
                if (innerText.includes("/")) {
                  containsXpath = containsXpath.replace(containsText, "");
                }
                attrTempXpath = containsXpath;
              } else {
                attrTempXpath = containsXpath;
              }
            }
          }
        } else {
          attrTempXpath = xpathWithAttributeWithTemp;
          if (attrValue.includes("/")) {
            // attrTempXpath = "//" + tagName + xpathWithoutAttribute + attrTempXpath;
            attrTempXpath = "//" + tagName;
          }
        }
        // }else if(innerText && element.getElementsByTagName('*').length===0){
      } else if (innerText) {
        var containsXpath = "//" + tagName + containsText + attrTempXpath;
        var totalMatch = _document.evaluate(
          containsXpath,
          _document,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
        ).snapshotLength;
        if (totalMatch === 0) {
          var equalsXpath = "//" + tagName + equalsText + attrTempXpath;
          var totalMatch = _document.evaluate(
            equalsXpath,
            _document,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
          ).snapshotLength;
          if (totalMatch === 1) {
            return equalsXpath;
          }
        } else if (totalMatch === 1) {
          return containsXpath;
        } else {
          containsXpath =
            "//" +
            tagName +
            "[contains(text(),'" +
            innerText.slice(0, 50) +
            "')]" +
            attrTempXpath;
          totalMatch = _document.evaluate(
            containsXpath,
            _document,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
          ).snapshotLength;
          if (totalMatch === 1) {
            return containsXpath;
          }
        }
        attrTempXpath = containsXpath;
      } else if (
        attrValue == null ||
        attrValue == "" ||
        attr.includes("xpath")
      ) {
        attrTempXpath = "//" + tagName + attrTempXpath;
      }
      if (j == 0) {
        attrTempXpath0 = attrTempXpath;
      }
    }
    tempXpath = attrTempXpath0;
    // }else if(attrValue=="" && innerText && element.getElementsByTagName('*').length===0 && !tagName.includes("script")){
  } else if (attrValue == "" && innerText && !tagName.includes("script")) {
    var containsXpath = "//" + tagName + containsText + tempXpath;
    var totalMatch = _document.evaluate(
      containsXpath,
      _document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    ).snapshotLength;
    if (totalMatch === 0) {
      tempXpath = "//" + tagName + equalsText + tempXpath;
      var totalMatch = _document.evaluate(
        tempXpath,
        _document,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      ).snapshotLength;
      if (totalMatch === 1) {
        return tempXpath;
      }
    } else if (totalMatch === 1) {
      return containsXpath;
    } else {
      containsXpath =
        "//" +
        tagName +
        "[contains(text(),'" +
        innerText.slice(0, 50) +
        "')]" +
        tempXpath;
      totalMatch = _document.evaluate(
        containsXpath,
        _document,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      ).snapshotLength;
      if (totalMatch === 1) {
        return containsXpath;
      }
      tempXpath = containsXpath;
    }
  } else {
    tempXpath = "//" + tagName + tempXpath;
  }
  var ix = 0;

  var siblings = element.parentNode.childNodes;
  for (var i = 0; i < siblings.length; i++) {
    var sibling = siblings[i];
    if (sibling === element) {
      indexes.push(ix + 1);
      tempXpath = buildRelXpath(_document, element.parentNode);
      if (!tempXpath.includes("/")) {
        return tempXpath;
      } else {
        var totalMatch = _document.evaluate(
          tempXpath,
          _document,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
        ).snapshotLength;
        if (totalMatch === 1) {
          return tempXpath;
        } else {
          tempXpath = "/" + tempXpath.replace(/\/\/+/g, "/");
          var regSlas = /\/+/g;
          var regBarces = /[^[\]]+(?=])/g; ////this is to get content inside all []
          while ((match = regSlas.exec(tempXpath)) != null) {
            matchIndex.push(match.index);
          }
          for (var j = 0; j < indexes.length; j++) {
            if (j === 0) {
              var lastTag = tempXpath.slice(matchIndex[matchIndex.length - 1]);
              if ((match = regBarces.exec(lastTag)) != null) {
                lastTag =
                  lastTag.replace(regBarces, indexes[j]).split("]")[0] + "]";
                tempXpath =
                  tempXpath.slice(0, matchIndex[matchIndex.length - 1]) +
                  lastTag;
              } else {
                tempXpath = tempXpath + "[" + indexes[j] + "]";
              }
            } else {
              var lastTag = tempXpath.slice(
                matchIndex[matchIndex.length - (j + 1)],
                matchIndex[matchIndex.length - j]
              );
              if ((match = regBarces.exec(lastTag)) != null) {
                lastTag = lastTag.replace(regBarces, indexes[j]);
                tempXpath =
                  tempXpath.slice(0, matchIndex[matchIndex.length - (j + 1)]) +
                  lastTag +
                  tempXpath.slice(matchIndex[matchIndex.length - j]);
              } else {
                tempXpath =
                  tempXpath.slice(0, matchIndex[matchIndex.length - j]) +
                  "[" +
                  indexes[j] +
                  "]" +
                  tempXpath.slice(matchIndex[matchIndex.length - j]);
              }
            }
            var totalMatch = _document.evaluate(
              tempXpath,
              _document,
              null,
              XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
              null
            ).snapshotLength;

            if (totalMatch === 1) {
              var regSlashContent = /([a-zA-Z])([^/]*)/g; //this regex is different for Chrome
              var length = tempXpath.match(regSlashContent).length;
              for (var k = j + 1; k < length - 1; k++) {
                var lastTag = tempXpath.match(/\/([^\/]+)\/?$/)[1];
                var arr = tempXpath.match(regSlashContent);
                arr.splice(length - k, 1, "/");
                var relXpath = "";
                for (var i = 0; i < arr.length - 1; i++) {
                  if (arr[i]) {
                    relXpath = relXpath + "/" + arr[i];
                  } else {
                    relXpath = relXpath + "//" + arr[i];
                  }
                }
                relXpath = (relXpath + "/" + lastTag).replace(/\/\/+/g, "//"); //replace more than 2 forward slashes to double slash
                relXpath = relXpath.replace(/\/\/+/g, "/"); //replace double forward slashes to single slash
                relXpath = relXpath.replace(/\/+/g, "//"); //replace single forward slashes to double slash
                var totalMatch = _document.evaluate(
                  relXpath,
                  _document,
                  null,
                  XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                  null
                ).snapshotLength;
                if (totalMatch === 1) {
                  tempXpath = relXpath;
                }
              }
              return tempXpath.replace("//html", "");
            }
          }
        }
      }
    }
    if (
      sibling.nodeType === 1 &&
      sibling.nodeName.toLowerCase() === element.nodeName.toLowerCase()
    ) {
      ix++;
    }
  }
}

function removeLineBreak(value) {
  if (value) {
    value =
      value.split("\n")[0].length > 0
        ? value.split("\n")[0]
        : value.split("\n")[1];
  }
  return value;
}

function formContextRelXpath(_document, element) {
  var innerText = [].reduce
    .call(
      element.childNodes,
      function (a, b) {
        return a + (b.nodeType === 3 ? b.textContent : "");
      },
      ""
    )
    .trim();
  // var innerText = element.textContent.trim().slice(0,50);
  innerText = removeLineBreak(innerText);

  //to delete unicode text like arrow icon
  // innerText = innerText.split(/[^\u0000-\u00ff]/).reduce(function (a, b) { return a.length > b.length ? a : b }, '').trim();

  //split the text if it contains / forward slash
  innerText = innerText.split("/")[0].trim();

  var tagName = element.nodeName.toLowerCase();

  if (tagName.includes("svg")) {
    tagName = "*";
  }

  if (innerText.includes("'")) {
    innerText = innerText.split("  ")[0];
    if ((innerText.length > 20) | doubleSpaceOrJunk) {
      containsText = '[contains(text(),"' + innerText.slice(0, 25) + '")]';
    } else {
      containsText = '[normalize-space()="' + innerText + '"]';
    }
    dotText = '[contains(.,"' + innerText + '")]';
    equalsText = '[normalize-space()="' + innerText + '"]';
    equalsText = doubleSpaceOrJunk ? containsText : equalsText;
  } else {
    innerText = innerText.split("  ")[0];
    if ((innerText.length > 20) | doubleSpaceOrJunk) {
      containsText = "[contains(text(),'" + innerText.slice(0, 25) + "')]";
    } else {
      containsText = "[normalize-space()='" + innerText + "']";
    }
    dotText = "[contains(.,'" + innerText + "')]";
    equalsText = "[normalize-space()='" + innerText + "']";
    equalsText = doubleSpaceOrJunk ? containsText : equalsText;
  }

  if (generateCssSelectorFlag) {
    innerText = "";
  }

  if (
    innerText &&
    (tagName == "a" ||
      tagName == "button" ||
      tagName == "label" ||
      tagName.charAt(0) == "h")
  ) {
    var equalsXpath = "//" + tagName + equalsText;
    var totalMatch = _document.evaluate(
      equalsXpath,
      _document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    ).snapshotLength;
    if (totalMatch === 1) {
      var dotXpath = "//" + tagName + dotText;
      var totalMatch = _document.evaluate(
        dotXpath,
        _document,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      ).snapshotLength;
      if (totalMatch === 1) {
        return equalsXpath;
      } else {
        var firstText = element.firstChild.textContent;
        firstText = deleteGarbageFromInnerText(firstText);
        var containsfirstText = "[normalize-space()='" + firstText + "']";
        var containsfirstXpath = "//" + tagName + containsfirstText;
        totalMatch = _document.evaluate(
          containsfirstXpath,
          _document,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
        ).snapshotLength;
        if (totalMatch === 1) {
          return containsfirstXpath;
        }
      }
    }
  }

  if (tagName.includes("html") || tagName.includes("body")) {
    return "//" + tagName + tempXpath;
  }
  var attr = "";
  var attrValue = "";
  var listOfAttr = {};

  if (element.id !== "") {
    var id = element.id;
    id = removeLineBreak(id);
    tempXpath = "//" + tagName + "[@id='" + id + "']" + tempXpath;
    var totalMatch = _document.evaluate(
      tempXpath,
      _document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    ).snapshotLength;
    if (totalMatch === 1) {
      return tempXpath;
    } else {
      if (innerText && element.getElementsByTagName("*").length === 0) {
        var containsXpath = "//" + tagName + containsText;
        var totalMatch = _document.evaluate(
          containsXpath,
          _document,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
        ).snapshotLength;
        if (totalMatch === 0) {
          var equalsXpath = "//" + tagName + equalsText;
          var totalMatch = _document.evaluate(
            equalsXpath,
            _document,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
          ).snapshotLength;
          if (totalMatch === 1) {
            return equalsXpath;
          } else {
            tempXpath = tempXpath;
          }
        } else if (totalMatch === 1) {
          return containsXpath;
        } else {
          tempXpath = tempXpath;
        }
      } else {
        tempXpath = tempXpath;
      }
    }
  } else if (element.attributes.length != 0) {
    if (!attrValue) {
      // listOfAttr = {};
      // listOfAttr = getListOfAttr(element);
      for (var i = 0; i < element.attributes.length; i++) {
        attr = element.attributes[i].name;
        attrValue = element.attributes[i].nodeValue;
        // if (attrValue!=null && attrValue!="" && !attr.includes("style") && !attr.includes("id") && !attr.includes("xpath")  && (attributeChoicesForXpath.includes("with"+attr) || userAttr==attr)){
        if (
          !attrValue.includes("/") &&
          attrValue != null &&
          attrValue != "" &&
          attr !== "style" &&
          attr !== "id" &&
          attr !== "shub-ins" &&
          attr !== "sh-att" &&
          attr !== "xpath" &&
          attr !== "xpathtest"
        ) {
          listOfAttr[attr] = attrValue;
        }
      }
    }
    if ("placeholder" in listOfAttr) {
      attr = "placeholder";
      attrValue = listOfAttr[attr];
    } else if ("title" in listOfAttr) {
      attr = "title";
      attrValue = listOfAttr[attr];
    } else if ("value" in listOfAttr) {
      attr = "value";
      attrValue = listOfAttr[attr];
    } else if ("name" in listOfAttr) {
      attr = "name";
      attrValue = listOfAttr[attr];
    } else if ("aria-label" in listOfAttr) {
      attr = "aria-label";
      attrValue = listOfAttr[attr];
    } else if ("alt" in listOfAttr) {
      attr = "alt";
      attrValue = listOfAttr[attr];
    } else if ("for" in listOfAttr) {
      attr = "for";
      attrValue = listOfAttr[attr];
    } else if ("data-label" in listOfAttr) {
      attr = "data-label";
      attrValue = listOfAttr[attr];
    } else if ("date-fieldlabel" in listOfAttr) {
      attr = "date-fieldlabel";
      attrValue = listOfAttr[attr];
    } else if ("data-displaylabel" in listOfAttr) {
      attr = "data-displaylabel";
      attrValue = listOfAttr[attr];
    } else if ("role" in listOfAttr) {
      attr = "role";
      attrValue = listOfAttr[attr];
    } else if ("type" in listOfAttr) {
      attr = "type";
      attrValue = listOfAttr[attr];
    } else if ("class" in listOfAttr) {
      attr = "class";
      attrValue = listOfAttr[attr];
    } else {
      attr = Object.keys(listOfAttr)[0];
      attrValue = listOfAttr[attr];
    }
    attrValue = removeLineBreak(attrValue); //sometime there is linespace in value so taking value before linespace.

    if (attrValue != null && attrValue != "" && attr !== "shub-ins" &&
    attr !== "sh-att" && attr !== "xpath") {
      var xpathWithoutAttribute = "//" + tagName + tempXpath;
      var xpathWithAttribute = "";
      if (attrValue.includes("  ")) {
        attrValue = attrValue.split("  ")[attrValue.split("  ").length - 1];
        containsFlag = true;
      }
      if (attrValue.includes("'")) {
        if (
          attrValue.charAt(0) === " " ||
          attrValue.charAt(attrValue.length - 1) === " " ||
          containsFlag
        ) {
          xpathWithAttribute =
            "//" +
            tagName +
            "[contains(@" +
            attr +
            ',"' +
            attrValue.trim() +
            '")]' +
            tempXpath;
        } else {
          xpathWithAttribute =
            "//" + tagName + "[@" + attr + '="' + attrValue + '"]' + tempXpath;
        }
      } else {
        if (
          attrValue.charAt(0) === " " ||
          attrValue.charAt(attrValue.length - 1) === " " ||
          containsFlag
        ) {
          xpathWithAttribute =
            "//" +
            tagName +
            "[contains(@" +
            attr +
            ",'" +
            attrValue.trim() +
            "')]" +
            tempXpath;
        } else {
          xpathWithAttribute =
            "//" + tagName + "[@" + attr + "='" + attrValue + "']" + tempXpath;
        }
      }

      var totalMatch = _document.evaluate(
        xpathWithAttribute,
        _document,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      ).snapshotLength;
      if (totalMatch === 1) {
        if (
          (xpathWithAttribute.includes("@href") &&
            !userAttr.includes("href")) ||
          (xpathWithAttribute.includes("@src") &&
            !userAttr.includes("src") &&
            innerText)
        ) {
          var containsXpath = "//" + tagName + containsText;
          var totalMatch = _document.evaluate(
            containsXpath,
            _document,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
          ).snapshotLength;
          if (totalMatch === 0) {
            var equalsXpath = "//" + tagName + equalsText;
            var totalMatch = _document.evaluate(
              equalsXpath,
              _document,
              null,
              XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
              null
            ).snapshotLength;
            if (totalMatch === 1) {
              return equalsXpath;
            }
          } else if (totalMatch === 1) {
            return containsXpath;
          }
        }
        return xpathWithAttribute;
        // }else if(innerText && element.getElementsByTagName('*').length===0){
        //this element.getElementsByTagName('*').length===0 check not required because innertext has only parent text.
      } else if (innerText) {
        var containsXpath = "//" + tagName + containsText;
        var totalMatch = _document.evaluate(
          containsXpath,
          _document,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
        ).snapshotLength;
        if (totalMatch === 0) {
          var equalsXpath = "//" + tagName + equalsText;
          var totalMatch = _document.evaluate(
            equalsXpath,
            _document,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
          ).snapshotLength;
          if (totalMatch === 1) {
            return equalsXpath;
          } else if (totalMatch > 1) {
            tempXpath = equalsXpath; //fix when contains text has comment too, like in react app
          } else {
            tempXpath = xpathWithAttribute;
          }
        } else if (totalMatch === 1) {
          return containsXpath;
        } else {
          containsXpath = xpathWithAttribute + containsText;
          totalMatch = _document.evaluate(
            containsXpath,
            _document,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
          ).snapshotLength;
          if (totalMatch === 0) {
            var equalsXpath = xpathWithAttribute + equalsText;
            var totalMatch = _document.evaluate(
              equalsXpath,
              _document,
              null,
              XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
              null
            ).snapshotLength;
            if (totalMatch === 1) {
              return equalsXpath;
            }
          } else if (totalMatch === 1) {
            return containsXpath;
          } else if (attrValue.includes("/") || innerText.includes("/")) {
            if (attrValue.includes("/")) {
              containsXpath = xpathWithoutAttribute + containsText;
            }
            if (innerText.includes("/")) {
              containsXpath = containsXpath.replace(containsText, "");
            }
            tempXpath = containsXpath;
          } else {
            tempXpath = containsXpath;
          }
        }
      } else {
        tempXpath = xpathWithAttribute;
        if (attrValue.includes("/")) {
          tempXpath = "//" + tagName + xpathWithoutAttribute;
        }
      }
      // }else if(innerText && element.getElementsByTagName('*').length===0){
    } else if (innerText) {
      var containsXpath = "//" + tagName + containsText;
      var totalMatch = _document.evaluate(
        containsXpath,
        _document,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      ).snapshotLength;
      if (totalMatch === 0) {
        var equalsXpath = "//" + tagName + equalsText;
        var totalMatch = _document.evaluate(
          equalsXpath,
          _document,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
        ).snapshotLength;
        if (totalMatch === 1) {
          return equalsXpath;
        }
      } else if (totalMatch === 1) {
        return containsXpath;
      }
      tempXpath = containsXpath + tempXpath;
    } else if (attrValue == null || attrValue == "" || attr.includes("xpath")) {
      tempXpath = "//" + tagName + tempXpath;
    }
    // }else if(attrValue=="" && innerText && element.getElementsByTagName('*').length===0 && !tagName.includes("script")){
  } else if (attrValue == "" && innerText && !tagName.includes("script")) {
    var containsXpath = "//" + tagName + containsText + tempXpath;
    var totalMatch = _document.evaluate(
      containsXpath,
      _document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    ).snapshotLength;
    if (totalMatch === 0) {
      tempXpath = "//" + tagName + equalsText + tempXpath;
      var totalMatch = _document.evaluate(
        tempXpath,
        _document,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      ).snapshotLength;
      if (totalMatch === 1) {
        return tempXpath;
      }
    } else if (totalMatch === 1) {
      return containsXpath;
    } else {
      tempXpath = containsXpath;
    }
  } else {
    tempXpath = "//" + tagName + tempXpath;
  }
  var ix = 0;

  var siblings = element.parentNode.childNodes;
  for (var i = 0; i < siblings.length; i++) {
    var sibling = siblings[i];
    if (sibling === element) {
      indexes.push(ix + 1);
      tempXpath = formContextRelXpath(_document, element.parentNode);
      if (!tempXpath.includes("/")) {
        return tempXpath;
      } else {
        var totalMatch = _document.evaluate(
          tempXpath,
          _document,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
        ).snapshotLength;
        if (totalMatch === 1) {
          return tempXpath;
        } else {
          tempXpath = "/" + tempXpath.replace(/\/\/+/g, "/");
          var regSlas = /\/+/g;
          var regBarces = /[^[\]]+(?=])/g; ////this is to get content inside all []
          while ((match = regSlas.exec(tempXpath)) != null) {
            matchIndex.push(match.index);
          }
          for (var j = 0; j < indexes.length; j++) {
            if (j === 0) {
              var lastTag = tempXpath.slice(matchIndex[matchIndex.length - 1]);
              if ((match = regBarces.exec(lastTag)) != null) {
                lastTag =
                  lastTag.replace(regBarces, indexes[j]).split("]")[0] + "]";
                tempXpath =
                  tempXpath.slice(0, matchIndex[matchIndex.length - 1]) +
                  lastTag;
              } else {
                tempXpath = tempXpath + "[" + indexes[j] + "]";
              }
            } else {
              var lastTag = tempXpath.slice(
                matchIndex[matchIndex.length - (j + 1)],
                matchIndex[matchIndex.length - j]
              );
              if ((match = regBarces.exec(lastTag)) != null) {
                lastTag = lastTag.replace(regBarces, indexes[j]);
                tempXpath =
                  tempXpath.slice(0, matchIndex[matchIndex.length - (j + 1)]) +
                  lastTag +
                  tempXpath.slice(matchIndex[matchIndex.length - j]);
              } else {
                tempXpath =
                  tempXpath.slice(0, matchIndex[matchIndex.length - j]) +
                  "[" +
                  indexes[j] +
                  "]" +
                  tempXpath.slice(matchIndex[matchIndex.length - j]);
              }
            }
            var totalMatch = _document.evaluate(
              tempXpath,
              _document,
              null,
              XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
              null
            ).snapshotLength;
            if (totalMatch === 1) {
              var regSlashContent = /([a-zA-Z])([^/]*)/g; //this regex is different for Chrome
              var length = tempXpath.match(regSlashContent).length;
              for (var k = j + 1; k < length - 1; k++) {
                var lastTag = tempXpath.match(/\/([^\/]+)\/?$/)[1];
                var arr = tempXpath.match(regSlashContent);
                arr.splice(length - k, 1, "/");
                var relXpath = "";
                for (var i = 0; i < arr.length - 1; i++) {
                  if (arr[i]) {
                    relXpath = relXpath + "/" + arr[i];
                  } else {
                    relXpath = relXpath + "//" + arr[i];
                  }
                }
                relXpath = (relXpath + "/" + lastTag).replace(/\/\/+/g, "//"); //replace more than 2 forward slashes to double slash
                relXpath = relXpath.replace(/\/\/+/g, "/"); //replace double forward slashes to single slash
                relXpath = relXpath.replace(/\/+/g, "//"); //replace single forward slashes to double slash
                var totalMatch = _document.evaluate(
                  relXpath,
                  _document,
                  null,
                  XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                  null
                ).snapshotLength;
                if (totalMatch === 1) {
                  tempXpath = relXpath;
                }
              }
              return tempXpath.replace("//html", "");
            }
          }
        }
      }
    }
    if (
      sibling.nodeType === 1 &&
      sibling.nodeName.toLowerCase() === element.nodeName.toLowerCase()
    ) {
      ix++;
    }
  }
}

var chooseAttrsForXpath = [];
var shadowDOMOpenOrClosed = "open";

// function isInShadow(node) {
//   var parent = node && node.parentNode;
//   while (parent) {
//     if (parent.toString() === "[object ShadowRoot]") {
//       shadowDOMOpenOrClosed = parent.mode.toString(); //to get open or closed shadow root
//       return true;
//     }
//     parent = parent.parentNode;
//   }
//   return false;
// }

function createRelXpath(element, chooseAttrs) {
  if (elementInShadowDom && !iframeXPathFlag) {
    inspectedElement = element;
  }
  // elementInShadowDom = isInShadow(element);
  // idChecked = withId;
  chooseAttrsForXpath = chooseAttrs.toString().split(",");
  var relXpath = "";
  var result = [];
  try {
    _document = element.ownerDocument;
  } catch {
    result.push("0 element matching.");
    result.push("0");
    return result;
  }

  var nodeName = element.nodeName.toLowerCase();

  if (nodeName.includes("#comment")) {
    relXpath =
      "This is a comment and selectors can't be generated for comment.";
  } else if (nodeName.includes("::")) {
    relXpath =
      "This is a pseudo element and selectors can't be generated for pseudo element.";
    // }else if(nodeName.includes("style")){
    //     relXpath = "This is a "+nodeName+" tag. For "+nodeName+" tag, no need to write xpath. :P";
    // }else if(nodeName.includes("#document-fragment")){
    //     relXpath = "This is a shadow-root and xpath can't be written for it. Please inspect an element.";
  } else if (elementInShadowDom && !iframeXPathFlag) {
    relXpath =
      "This element is inside Shadow DOM and for such elements XPath won't support.";
    relXpath = shadowDOMOpenOrClosed.includes("closed")
      ? "This element is inside closed Shadow DOM which is inaccessible so for such elements we can't verify/write selectors."
      : relXpath;
  } else {
    // createAbsXpath(element);
    try {
      if (absXpath.includes("/*[name")) {
        relXpath = buildRelXpathForSVG(_document, element);
      } else {
        relXpath = createOptimizedRelXpath(_document, element);
      }
    } catch (err) {
      if (frameOriframe) {
        createAbsXpath(element);
        relXpath = absXpath;
      } else {
        relXpath = absXpath; //incase any error comes in rel xpath calculation then it will return absXpath
      }
    }
  }

  tempXpath = "";
  // absXpath = "";

  try {
    var totalMatch = _document.evaluate(
      relXpath,
      _document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    ).snapshotLength;
  } catch (err) {
    totalMatch = 0;
  }

  result.push(relXpath);
  result.push(totalMatch);

  //checking id and class alphanumeric
  if (
    (relXpath.includes("@id=") || relXpath.includes("contains(@id")) &&
    isAttributeDynamic(relXpath, "id")
  ) {
    result.push("id");
  }
  if (
    (relXpath.includes("@class=") || relXpath.includes("contains(@class")) &&
    isAttributeDynamic(relXpath, "class")
  ) {
    result.push("class");
  }
  if (
    (relXpath.includes("@name=") || relXpath.includes("contains(@name")) &&
    isAttributeDynamic(relXpath, "name")
  ) {
    result.push("name");
  }

  return result;

  //return relXpath;
}

function optimizeXpath(_document, xpath) {
  let xpathDiv = xpath.split("//");
  let leng = xpathDiv.length;
  var regBarces = /[^[\]]+(?=])/g; //this is to get content inside all []
  let bracesContentArr = xpath.match(regBarces);
  let startOptimizingFromHere = 1;
  for (let j = bracesContentArr.length - 1; j > 0; j--) {
    startOptimizingFromHere++;
    if (bracesContentArr[j].length > 3) {
      startOptimizingFromHere = startOptimizingFromHere;
      break;
    }
  }
  let tempXpath = xpath.split(
    "//" + xpathDiv[leng - startOptimizingFromHere]
  )[1];
  let totalMatch = 0;
  try {
    totalMatch = _document.evaluate(
      tempXpath,
      _document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    ).snapshotLength;
  } catch (err) {
    return xpath;
  }
  if (totalMatch === 1) {
    return tempXpath;
  }
  for (let i = leng - startOptimizingFromHere; i > 0; i--) {
    let temp = xpath.replace("//" + xpathDiv[i], "");
    try {
      totalMatch = _document.evaluate(
        temp,
        _document,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      ).snapshotLength;
      if (totalMatch === 1) {
        xpath = temp;
      }
    } catch (err) {
      return xpath;
    }
  }
  return xpath;
}

function getElementNodename(element) {
  var name = "",
    className;
  if (element.classList.length) {
    name = [element.nodeName.toLowerCase()];

    className = element.attributes["class"].value.trim();
    className = className.replace(/  +/g, " ");
    name.push(className.split(" ").join("."));
    name = name.join(".");
  }
  return name;
}

function getElementChildNumber(node) {
  var classes = {},
    i,
    firstClass,
    uniqueClasses;
  var parentNode = node.parentNode,
    childrenLen;
  childrenLen = parentNode.children.length;
  for (i = 0; i < childrenLen; i++) {
    if (parentNode.children[i].classList.length) {
      firstClass = parentNode.children[i].classList[0];
      if (!classes[firstClass]) {
        classes[firstClass] = [parentNode.children[i]];
      } else {
        classes[firstClass].push(parentNode.children[i]);
      }
    }
  }
  uniqueClasses = Object.keys(classes).length || -1;
  var obj = {
    childIndex: -1,
    childLen: childrenLen,
  };

  if (classes[Object.keys(classes)[0]] === childrenLen) {
    obj.childIndex = Array.prototype.indexOf.call(
      classes[node.classList[0]],
      node
    );
    obj.childLen = classes[Object.keys(classes)[0]].length;
    return obj;
  } else if (
    uniqueClasses &&
    uniqueClasses !== -1 &&
    uniqueClasses !== childrenLen
  ) {
    obj.childIndex = Array.prototype.indexOf.call(parentNode.children, node);
    obj.childLen = classes[Object.keys(classes)[0]].length;
    return obj;
  } else if (uniqueClasses === -1) {
    obj.childIndex = Array.prototype.indexOf.call(parentNode.children, node);
    obj.childLen = childrenLen;
    return obj;
  } else {
    return obj;
  }
}

function parents(element, _array) {
  var name, index;
  if (_array === undefined) {
    _array = [];
  } else {
    index = getElementChildNumber(element);
    name = getElementNodename(element);
    if (name) {
      if (index.childLen >= 1 && index.childIndex !== -1) {
        name += ":nth-child(" + (index.childIndex + 1) + ")";
      }
      _array.push(name);
    } else if (_array.length < 5) {
      name = element.nodeName.toLowerCase();
      if (index.childIndex !== -1) {
        name += ":nth-child(" + (index.childIndex + 1) + ")";
      }
      _array.push(name);
    }
  }
  if (element.nodeName !== "BODY") {
    return parents(element.parentNode, _array);
  } else {
    return _array;
  }
}

function buildAbsCssSelector(element) {
  if (element.nodeName.toLowerCase() === "html") return "html";
  if (element.nodeName.toLowerCase() === "body") return "body";
  if (element.nodeName.toLowerCase() === "#document-fragment") return "";

  var siblings = element.parentNode.children;
  for (var i = 0; i < siblings.length; i++) {
    var sibling = siblings[i];
    if (sibling === element) {
      var cssSelector = "";
      cssSelector =
        buildAbsCssSelector(element.parentNode) +
        " > " +
        element.nodeName.toLowerCase() +
        ":nth-child(" +
        (i + 1) +
        ")";
      cssSelector =
        cssSelector.trim().charAt(0) == ">"
          ? cssSelector.trim().slice(1)
          : cssSelector;
      return cssSelector;
    }
  }

  return cssSelector;
}

var xpathForCss = false;
var generateCssSelectorFlag = false;
function createCssSelector(element, chooseAttrs) {
  xpathForCss = true;
  if (elementInShadowDom && !iframeXPathFlag) {
    inspectedElement = element;
  }
  // elementInShadowDom = isInShadow(element);
  //chooseAttrs = chooseAttrs.toString().replace("withtext","withouttext");
  var result = [];
  var totalMatch = 0;
  var cssSelector = "";
  var userAttr = chooseAttrsForXpath[0];

  try {
    if (!element) {
      cssSelector =
        "element is inside iframe & it is not supported by SelectorsHub currently. Please write CSS manually.";
      totalMatch = 0;
    }

    if (shadowDOMOpenOrClosed.includes("closed")) {
      cssSelector =
        "element is inside closed shadow dom & selectors can't be written for it.";
      totalMatch = 0;
      result.push(cssSelector);
      result.push(totalMatch);
      return result;
    }

    var tagName = element.nodeName.toLowerCase();
    // if (tagName.includes("style")) {
    //     cssSelector = "This is " + tagName + " tag. For " + tagName + " tag, no need to write selector. :P";
    //     totalMatch = 0;
    // }

    if (
      (!element.getAttribute(userAttr) || userAttr.toLowerCase() === "id") &&
      element.id !== "" &&
      (chooseAttrsForXpath.includes("withid") ||
        userAttr.toLowerCase() === "id")
    ) {
      //if (element.id !== '' && (userAttr && !(userAttr!='id'))) {
      cssSelector = "#" + element.id.trim();
      
      totalMatch = cssSelectorMatchingNode(element, cssSelector);
      if(totalMatch==0){
        cssSelector = tagName+"[id='"+element.id.trim()+"']"
      }
      
    } else if (tagName == "body" || tagName == "head" || tagName == "html") {
      cssSelector = tagName;
    } else if (elementInShadowDom || hostShadowDom) {
      if (
        element.className &&
        !tagName.includes("svg") &&
        !isSVGChild(element) &&
        (userAttr == "class" || !chooseAttrsForXpath.includes("withoutclass"))
      ) {
        cssSelector = "." + replaceAll(element.className.trim(), " ", ".");
        totalMatch = cssSelectorMatchingNode(element, cssSelector);
        if (totalMatch === 1) {
          result.push(cssSelector);
          result.push(totalMatch);
          return result;
        }
      }

      // if (tagName.includes("svg") || isSVGChild(element)) {
      //   cssSelector = tagName;
      //   totalMatch = cssSelectorMatchingNode(element, cssSelector);
      //   result.push(cssSelector);
      //   result.push(totalMatch);
      //   return result;
      // }
      var attr = "";
      var attrValue = "";
      var listOfAttr = {};
      cssSelector = tagName;
      for (var i = 0; i < element.attributes.length; i++) {
        attr = element.attributes[i].name;
        attrValue = element.attributes[i].nodeValue;
        if (
          attrValue != null &&
          attrValue != "" &&
          (attr !== "style" || userAttr === "style") &&
          attr !== "id" &&
          attr !== "xpath" &&
          attr !== "shub-ins" &&
          attr !== "sh-att" &&
          attr !== "xpathtest" &&
          attr !== "cssselectortest" &&
          (!chooseAttrsForXpath.includes("without" + attr) || userAttr == attr)
        ) {
          listOfAttr[attr] = attrValue;
        }
      }
      for (var j = 0; j < Object.keys(listOfAttr).length; j++) {
        if (userAttr in listOfAttr) {
          attr = userAttr;
          attrValue = listOfAttr[attr];
        } else if ("placeholder" in listOfAttr) {
          attr = "placeholder";
          attrValue = listOfAttr[attr];
        } else if ("title" in listOfAttr) {
          attr = "title";
          attrValue = listOfAttr[attr];
        } else if ("value" in listOfAttr) {
          attr = "value";
          attrValue = listOfAttr[attr];
        } else if ("name" in listOfAttr) {
          attr = "name";
          attrValue = listOfAttr[attr];
        } else if ("aria-label" in listOfAttr) {
          attr = "aria-label";
          attrValue = listOfAttr[attr];
        } else if ("alt" in listOfAttr) {
          attr = "alt";
          attrValue = listOfAttr[attr];
        } else if ("for" in listOfAttr) {
          attr = "for";
          attrValue = listOfAttr[attr];
        } else if ("data-label" in listOfAttr) {
          attr = "data-label";
          attrValue = listOfAttr[attr];
        } else if ("date-fieldlabel" in listOfAttr) {
          attr = "date-fieldlabel";
          attrValue = listOfAttr[attr];
        } else if ("data-displaylabel" in listOfAttr) {
          attr = "data-displaylabel";
          attrValue = listOfAttr[attr];
        } else if ("role" in listOfAttr) {
          attr = "role";
          attrValue = listOfAttr[attr];
        } else if ("type" in listOfAttr) {
          attr = "type";
          attrValue = listOfAttr[attr];
        } else if ("class" in listOfAttr) {
          attr = "class";
          attrValue = listOfAttr[attr];
        } else {
          attr = Object.keys(listOfAttr)[0];
          attrValue = listOfAttr[attr];
          // if(isAlphaNumeric(attrValue)){
          //     attr ="";
          //     attrValue ="";
          // }
        }
        attrValue = deleteLineGap(attrValue); //sometime there is linespace in value so taking value before linespace.
        delete listOfAttr[attr];
        if (
          attrValue != null &&
          attrValue != "" &&
          attr !== "css" &&
          attr !== "shub-ins" &&
          attr !== "sh-att" &&
          attr !== "xpath"
        ) {
          if (attrValue.includes("'")) {
            cssSelector =
              cssSelector + "[" + attr + '="' + attrValue.trim() + '"]';
          } else {
            cssSelector = cssSelector + "[" + attr + "='" + attrValue + "']";
          }

          totalMatch = cssSelectorMatchingNode(element, cssSelector);

          if (totalMatch === 1) {
            result.push(cssSelector);
            result.push(totalMatch);
            return result;
          }
        }
      }
    } else if (!absXpath.includes("/*[local-name") || !absXpath.includes("/*[name()")) {
      if (element.className && !(userAttr != "class")) {
        cssSelector = "." + replaceAll(element.className.trim(), " ", ".");
        totalMatch = cssSelectorMatchingNode(element, cssSelector);
        if (totalMatch === 1) {
          result.push(cssSelector);
          result.push(totalMatch);
          return result;
        }
        cssSelector = "";
      }

      // if (tagName.includes("svg") || isSVGChild(element)) {
      //   cssSelector = tagName;
      //   totalMatch = cssSelectorMatchingNode(element, cssSelector);
      //   result.push(cssSelector);
      //   result.push(totalMatch);
      //   return result;
      // }
      var attr = "";
      var attrValue = "";
      var listOfAttr = {};
      cssSelector = tagName;
      for (var i = 0; i < element.attributes.length; i++) {
        attr = element.attributes[i].name;
        attrValue = element.attributes[i].nodeValue;
        if (
          attrValue != null &&
          attrValue != "" &&
          (attr !== "style" || userAttr === "style") &&
          attr !== "xpath" &&
          attr !== "shub-ins" &&
          attr !== "sh-att" &&
          attr !== "xpathtest" &&
          attr !== "cssselectortest" &&
          (!chooseAttrsForXpath.includes("without" + attr) || userAttr == attr)
        ) {
          listOfAttr[attr] = attrValue;
        }
      }

      for (var j = 0; j < Object.keys(listOfAttr).length; j++) {
        if (userAttr in listOfAttr) {
          attr = userAttr;
          attrValue = listOfAttr[attr];
        } else if ("id" in listOfAttr) {
          attr = "id";
          attrValue = listOfAttr[attr];
        } else if ("placeholder" in listOfAttr) {
          attr = "placeholder";
          attrValue = listOfAttr[attr];
        } else if ("title" in listOfAttr) {
          attr = "title";
          attrValue = listOfAttr[attr];
        } else if ("value" in listOfAttr) {
          attr = "value";
          attrValue = listOfAttr[attr];
        } else if ("name" in listOfAttr) {
          attr = "name";
          attrValue = listOfAttr[attr];
        } else if ("aria-label" in listOfAttr) {
          attr = "aria-label";
          attrValue = listOfAttr[attr];
        } else if ("alt" in listOfAttr) {
          attr = "alt";
          attrValue = listOfAttr[attr];
        } else if ("for" in listOfAttr) {
          attr = "for";
          attrValue = listOfAttr[attr];
        } else if ("data-label" in listOfAttr) {
          attr = "data-label";
          attrValue = listOfAttr[attr];
        } else if ("date-fieldlabel" in listOfAttr) {
          attr = "date-fieldlabel";
          attrValue = listOfAttr[attr];
        } else if ("data-displaylabel" in listOfAttr) {
          attr = "data-displaylabel";
          attrValue = listOfAttr[attr];
        } else if ("role" in listOfAttr) {
          attr = "role";
          attrValue = listOfAttr[attr];
        } else if ("type" in listOfAttr) {
          attr = "type";
          attrValue = listOfAttr[attr];
        } else if ("class" in listOfAttr) {
          attr = "class";
          attrValue = listOfAttr[attr];
        } else {
          attr = Object.keys(listOfAttr)[0];
          attrValue = listOfAttr[attr];
          // if(isAlphaNumeric(attrValue)){
          //     attr ="";
          //     attrValue ="";
          // }
        }
        attrValue = deleteLineGap(attrValue); //sometime there is linespace in value so taking value before linespace.
        delete listOfAttr[attr];
        if (
          attrValue != null &&
          attrValue != "" &&
          attr !== "css" &&
          attr !== "shub-ins" &&
          attr !== "sh-att" &&
          attr !== "xpath"
        ) {
          if (attr == "id") {
            cssSelector = "#" + attrValue.trim();
          } else if (attr == "class") {
            cssSelector = "." + replaceAll(attrValue.trim(), " ", ".");
          } else if (attrValue.includes("'")) {
            cssSelector =
              cssSelector + "[" + attr + '="' + attrValue.trim() + '"]';
          } else {
            cssSelector = cssSelector + "[" + attr + "='" + attrValue + "']";
          }

          totalMatch = cssSelectorMatchingNode(element, cssSelector);

          if (totalMatch === 1) {
            result.push(cssSelector);
            result.push(totalMatch);
            return result;
          }
        }
      }

      cssSelector = "";
      var relXpath = "";

      generateCssSelectorFlag = true;
      if (
        suggestedFlag ||
        globalRelXpath.includes("normalize-space()") ||
        globalRelXpath.includes("text()")
      ) {
        relXpath = createRelXpath(element, chooseAttrs)[0];
      } else {
        relXpath = globalRelXpath;
      }
      generateCssSelectorFlag = false;

      xpathForCss = false; //reset this value to generate xpath with contains
      try {
        // if (relXpath.includes("/*[local-name") || relXpath.includes("/*[name()")){
        //   console.log(relXpath);
        //   relXpath = relXpath.replace("*[name()", tagName);
        //   console.log(relXpath);
        // }
        if (!relXpath.includes("@href") && !relXpath.includes("@src")) {
          var temp = relXpath.replace(/\/+/g, "//"); //change single forward slash to double forward slash
          temp = temp.split("//");
          var regBarces = /[^[\]]+(?=])/g; //regex to get content inside square brackets

          for (var i = 1; i < temp.length; i++) {
            var tempCss = temp[i];
            if (tempCss.includes("[")) {
              var squareBracketsContent = temp[i].match(regBarces)[0];
              tempCss =
                squareBracketsContent.length < 4
                  ? temp[i].split("[")[0] +
                    ":nth-child(" +
                    squareBracketsContent +
                    ")"
                  : temp[i].replace(/\[\@/g, "[");
            }
            
            if (tempCss.includes("*[local-name") || tempCss.includes("*[name()")){
              tempCss = tempCss.split("'")[1];
            }
            cssSelector = cssSelector + " " + tempCss;
          }
        } else {
          cssSelector = relXpath.replace("//", "").replace(/\[\@/g, "[");
        }
      } catch (err) {}
      totalMatch = cssSelectorMatchingNode(element, cssSelector);
    }

    totalMatch = cssSelectorMatchingNode(element, cssSelector);

    if (totalMatch != 1 || absXpath.includes("/*[local-name")) {
      cssSelector = buildAbsCssSelector(element);
      // if(!elementInShadowDom && !hostShadowDom){
      //     // cssSelector = parentCssSelector(element, chooseAttrs);
      //     cssSelector = buildAbsCssSelector(element);
      // }else if(element.parentElement){
      //     cssSelector = buildAbsCssSelector(element);
      //     console.log(cssSelector);
      // }
      totalMatch = cssSelectorMatchingNode(element, cssSelector);

      if (totalMatch != 1) {
        var path = parents(element, []);
        path = path.reverse();
        var lastNode = path.slice(path.length - 1, path.length);
        var _path = path.slice(0, path.length - 1);
        cssSelector = "";
        if (_path.length != 0) {
          cssSelector = _path.join(" ") + " > " + lastNode;
        } else {
          //hack for body tag which is the 1st tag in html page
          cssSelector = lastNode;
        }
      }
    }

    totalMatch = cssSelectorMatchingNode(element, cssSelector);
  } catch (err) {
    cssSelector = buildAbsCssSelector(element);
    totalMatch = cssSelectorMatchingNode(element, cssSelector);
  }

  result.push(cssSelector);
  result.push(totalMatch);
  // generateCssSelectorFlag = false;
  return result;
}

function parentCssSelector(element, chooseAttrs) {
  var parentElement = element;
  var parentCss = "";
  var cssSelector = "";
  var totalMatch = 0;
  var tagName = element.nodeName.toLowerCase();

  var allIndexes = absXpath.match(/[^[\]]+(?=])/g);
  var totalIndexes = allIndexes.length;
  var tempCssSelector = "";
  for (var i = totalIndexes - 1; i >= 0; i--) {
    if (parentElement.id) {
      parentCss = "#" + parentElement.id;
    } else if (
      !chooseAttrs.includes("withoutclass") &&
      !absXpath.includes("/*[local-name") &&
      parentElement.className
    ) {
      parentCss =
        parentElement.nodeName.toLowerCase() +
        "." +
        replaceAll(parentElement.className.trim(), " ", ".") +
        ":nth-child(" +
        allIndexes[i] +
        ")";
    } else {
      parentCss =
        parentElement.nodeName.toLowerCase() +
        ":nth-child(" +
        allIndexes[i] +
        ")";
    }

    tempCssSelector = cssSelector ? parentCss + " > " + cssSelector : parentCss;

    totalMatch = cssSelectorMatchingNode(element, cssSelector);

    if (totalMatch == 1) {
      return cssSelector;
    } else if (totalMatch == 0) {
      cssSelector = cssSelector
        ? parentElement.nodeName.toLowerCase() + " > " + cssSelector
        : parentElement.nodeName.toLowerCase();
    } else {
      cssSelector = cssSelector ? parentCss + " > " + cssSelector : parentCss;
    }

    parentElement = parentElement.parentNode;
    if (parentElement.nodeName.toLowerCase() === "body") {
      return "body > " + cssSelector;
    }
  }
}

function cssSelectorMatchingNode(element, cssSelector) {
  var totalMatch = 0;
  if (elementInShadowDom && !iframeXPathFlag) {
    try {
      totalMatch = element
        .getRootNode()
        .host.shadowRoot.querySelectorAll(cssSelector).length;
    } catch (err) {
      totalMatch = 0;
    }
  } else {
    try {
      var elements = _document.querySelectorAll(cssSelector); //css
      totalMatch = elements.length;
    } catch (err) {
      totalMatch = 0;
    }
  }
  return totalMatch;
}

function createSelectorName(element) {
  _document = element.ownerDocument;
  var insideIframe = _document !== document ? "(inside iframe)" : "";

  var tagsForLabel = [
    "button",
    "input",
    "meter",
    "output",
    "progress",
    "select",
    "textarea",
  ];

  var attr = "";
  var attrValue = "";
  var listOfAttr = {};
  var label = "";
  var tagName = element.nodeName.toLowerCase();
  if (tagName.includes("path") || tagName == "g") {
    while (!element.nodeName.toLowerCase().includes("svg")) {
      element = element.parentElement;
      tagName = element.nodeName.toLowerCase();
      if (tagName.includes("svg")) {
        break;
      }
    }
  }

  if (tagName.includes("svg")) {
    element = element.parentElement ? element.parentElement : element;
  }

  if (tagName.includes("pseudo")) {
    var parentClass = element.parentElement.className;
    if (parentClass.includes("icon")) {
      label = parentClass.replace(/-/g, "");
    } else {
      label = getComputedStyle(element, "").getPropertyValue("content");
    }
    return label.trim() + insideIframe;
  } else if (tagsForLabel.includes(tagName) && element.id) {
    try {
      label = _document.querySelector(
        "label[for='" + element.id + "']"
      ).textContent;
      //label = label.replace(/ /g, ""); //delete all blank space between words
      return label.trim() + insideIframe;
    } catch (err) {}
  } else if (
    tagName.includes("style") ||
    tagName.includes("script") ||
    tagName.includes("body") ||
    tagName.includes("html") ||
    tagName.includes("head") ||
    tagName.includes("link") ||
    tagName.includes("meta") ||
    tagName.includes("title") ||
    tagName.includes("comment")
  ) {
    try {
      if (element.className) {
        label = element.className.split(" ")[0];
      } else if (element.id) {
        label = element.id;
      } else {
        label = tagName + "Element";
      }
      //label = label.replace(/ /g, ""); //delete all blank space between words
      return label.trim() + insideIframe;
    } catch (err) {}
  }

  var textContent = element.textContent.trim();
  if (textContent && textContent.length < 2) {
    textContent = element.parentNode.textContent.trim();
  }

  if (tagName.includes("label")) {
    // label = [].reduce.call(element.childNodes, function (a, b) { return a + (b.nodeType === 3 ? b.textContent : ''); }, '').trim();
    label = textContent;
  } else if (element.attributes.length != 0) {
    if (!attrValue) {
      for (var i = 0; i < element.attributes.length; i++) {
        attr = element.attributes[i].name;
        attrValue = element.attributes[i].nodeValue;
        if (
          attrValue != null &&
          attrValue != "" &&
          !attr.includes("style") &&
          !attr.includes("xpath")
        ) {
          listOfAttr[attr] = attrValue;
        }
      }
    }
    // var textContent = [].reduce.call(element.childNodes, function (a, b) { return a + (b.nodeType === 3 ? b.textContent : ''); }, '').trim();
    // var textContent = element.textContent;
    // if(textContent.length<2){
    //     textContent = element.parentNode.textContent;
    // }
    attr = "";
    attrValue = "";
    if ("placeholder" in listOfAttr) {
      attr = "placeholder";
      attrValue = listOfAttr[attr];
    } else if (textContent.trim()) {
      attrValue = textContent;
    } else if ("aria-label" in listOfAttr) {
      attr = "aria-label";
      attrValue = listOfAttr[attr];
    } else if ("name" in listOfAttr) {
      attr = "name";
      attrValue = listOfAttr[attr];
    } else if ("value" in listOfAttr) {
      attr = "value";
      attrValue = listOfAttr[attr];
    } else if ("title" in listOfAttr) {
      attr = "title";
      attrValue = listOfAttr[attr];
    } else if ("alt" in listOfAttr) {
      attr = "alt";
      attrValue = listOfAttr[attr];
    } else if ("for" in listOfAttr) {
      attr = "for";
      attrValue = listOfAttr[attr];
    } else if ("data-label" in listOfAttr) {
      attr = "data-label";
      attrValue = listOfAttr[attr];
    } else if ("date-fieldlabel" in listOfAttr) {
      attr = "date-fieldlabel";
      attrValue = listOfAttr[attr];
    } else if ("data-displaylabel" in listOfAttr) {
      attr = "data-displaylabel";
      attrValue = listOfAttr[attr];
    } else if ("role" in listOfAttr) {
      attr = "role";
      attrValue = listOfAttr[attr];
    } else if ("id" in listOfAttr) {
      attr = "id";
      attrValue = listOfAttr[attr];
    }
    label = attrValue;
    if (!label) {
      var iconTypes = [
        "search",
        "remove",
        "delete",
        "close",
        "cancel",
        "plus",
        "add",
        "subtract",
        "minus",
        "cart",
        "home",
        "logo",
        "notification",
        "globe",
      ];
      try {
        var className = element.className.toLowerCase();
        if (className) {
          for (var i = 0; i < iconTypes.length; i++) {
            if (className.includes(iconTypes[i])) {
              label = iconTypes[i] + " icon";
            }
          }
        }
      } catch (err) {}
    }
  }

  if (!label || (label.length < 3 && textContent)) {
    //label = [].reduce.call(element.childNodes, function (a, b) { return a + (b.nodeType === 3 ? b.textContent : ''); }, '').trim();
    label = textContent;
    label = label ? label : element.textContent.trim();

    // var tempElement = element;
    if (!label) {
      // while (tempElement){
      //     var pseudo = window.getComputedStyle(tempElement, ':before');
      //     var pseudoValue = pseudo.getPropertyValue("content");
      //     if(!pseudoValue.includes("none")){
      //         label = pseudoValue;
      //         break;
      //     }else{
      //         tempElement=tempElement.firstElementChild;
      //     }
      // }
      // var w = new WebPage(document);
      // try{
      //     label = w.getLabel(element);
      // }catch(err){
      // }

      var is_label_has_duplication = false;
      if (label && label.text && label.text.length) {
        var len = label && label.text && Math.round(label.text.length / 2);
        var first_half_label = label.text.slice(0, len);
        is_label_has_duplication = first_half_label == label.text.slice(len);
      }

      if (is_label_has_duplication) {
        label.text = first_half_label;
        label = label.text;
      }
      label = label ? label.text : "";
    }

    if (!label && element.parentElement) {
      label = element.parentElement.textContent.trim();
    } else if (!label) {
      label = tagName + "Element";
    }
  }

  if (!label) {
    element = element.parentElement;
    label = createSelectorName(element);
    //label = tagName + "Tag";
  }
  label = label ? label : "";
  label = label.includes("inside iframe") ? label : label + insideIframe;
  //label = label.replace(/ /g, ""); //delete all blank space between words
  return label.trim().substr(0, 100);
}

function createOptimizedRelXpath(_document, element) {
  let relXpath = "";
  try {
    // relXpath = generateContextMenu ? formContextRelXpath(_document, element) : buildRelXpath(_document, element);
    relXpath = buildRelXpath(_document, element);
    // var xpathWithoutClass = "";
    // if(relXpath.includes("@class") && !chooseAttrsForXpath[0].includes("class") && chooseAttrsForXpath.includes("withclass") && element.className){
    //     tempXpath = "";
    //     chooseAttrsForXpath[2] = "withoutclass";
    //     try{
    //         xpathWithoutClass = buildRelXpath(_document, element);
    //         if(xpathWithoutClass && relXpath.length > xpathWithoutClass.length && !(xpathWithoutClass.match(/\/+/g).length > relXpath.match(/\/+/g).length+2)){
    //             relXpath = xpathWithoutClass;
    //         }
    //     }catch (err) {
    //         relXpath = relXpath;
    //     }
    //     chooseAttrsForXpath[2] = "withclass"; //setting it back
    // }
  } catch (err) {
    tempXpath = "";
    chooseAttrsForXpath = ["withoutid", "withoutclass"];
    relXpath = buildRelXpath(_document, element);
  }
  let doubleForwardSlash = /\/\/+/g; //regex to find double forward slash
  let numOfDoubleForwardSlash = 0;
  try {
    numOfDoubleForwardSlash = relXpath.match(doubleForwardSlash).length;
  } catch (err) {}
  if (
    numOfDoubleForwardSlash > 1 &&
    relXpath.includes("[") &&
    !relXpath.includes("@href") &&
    !relXpath.includes("@src")
  ) {
    relXpath = optimizeXpath(_document, relXpath);
  }
  if (relXpath === undefined) {
    relXpath =
      "It might be pseudo element/comment/inside iframe from cross-origin. XPath doesn't support for them.";
  }
  return relXpath;
}

function buildRelXpathForSVG(_document, element) {
  //this will give only parent text, not the child node text
  var userAttr = chooseAttrsForXpath[0];

  var tagName = element.nodeName.toLowerCase();
  tagFormat = "//*[name()='" + tagName;
  // if (tagName.includes('svg')) {
  //     tagFormat = "//*[local-name()='" + tagName;
  // } else {
  //     tagFormat = "//*[name()='" + tagName;
  // }

  if (tagName.includes("svg")) {
    try {
      var relXpath = tempXpath;
      tempXpath = "";
      indexes = [];
      tempXpath =
        createOptimizedRelXpath(_document, element.parentNode) +
        "//*[name()='svg']" +
        relXpath;
      indexes = [];
    } catch (err) {}
    return tempXpath;
  }

  var attr = "";
  var attrValue = "";
  var listOfAttr = {};
  var numberOfAttr = "";
  try {
    element.attributes.removeNamedItem("xpath");
    numberOfAttr = element.attributes.length;
  } catch (err) {
    numberOfAttr = element.attributes.length;
  }
  if (
    (!element.getAttribute(userAttr) || userAttr.toLowerCase() === "id") &&
    element.id !== "" &&
    chooseAttrsForXpath.includes("withid")
  ) {
    var id = element.id;
    id = deleteLineGap(id);

    tempXpath = tagFormat + "' and @id='" + id + "']" + tempXpath;
    // if(tagName.includes('svg')){
    var totalMatch = _document.evaluate(
      tempXpath,
      _document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    ).snapshotLength;
    if (totalMatch === 1) {
      return tempXpath;
    }
    // }
  } else if (numberOfAttr > 0) {
    if (!attrValue) {
      for (var i = 0; i < element.attributes.length; i++) {
        attr = element.attributes[i].name;
        attrValue = element.attributes[i].nodeValue;

        // if (attrValue!=null && attrValue!="" && !attr.includes("style") && !attr.includes("id") && !attr.includes("xpath")  && (chooseAttrsForXpath.includes("with"+attr) || userAttr==attr)){
        if (
          attrValue != null &&
          attrValue != "" &&
          (attr !== "style" || userAttr === "style") &&
          attr !== "id" &&
          attr !== "shub-ins" &&
          attr !== "sh-att" &&
          attr !== "xpath"
        ) {
          listOfAttr[attr] = attrValue.trim().slice(0, 10);
        }
      }
    }
    if (Object.keys(listOfAttr).length > 0) {
      if (userAttr in listOfAttr) {
        attr = userAttr;
        attrValue = listOfAttr[attr];
      } else if ("placeholder" in listOfAttr) {
        attr = "placeholder";
        attrValue = listOfAttr[attr];
      } else if ("title" in listOfAttr) {
        attr = "title";
        attrValue = listOfAttr[attr];
      } else if ("value" in listOfAttr) {
        attr = "value";
        attrValue = listOfAttr[attr];
      } else if ("name" in listOfAttr) {
        attr = "name";
        attrValue = listOfAttr[attr];
      } else if ("type" in listOfAttr) {
        attr = "type";
        attrValue = listOfAttr[attr];
      } else if ("class" in listOfAttr) {
        attr = "class";
        attrValue = listOfAttr[attr];
      } else {
        attr = Object.keys(listOfAttr)[0];
        attrValue = listOfAttr[attr];
      }

      attrValue = deleteLineGap(attrValue); //sometime there is linespace in value so taking value before linespace.

      if (attrValue != null && attrValue != "" && attr !== "xpath" && attr !== "shub-ins" &&
      attr !== "sh-att") {
        var xpathWithAttribute = "";
        if (attrValue.includes("  ")) {
          attrValue = attrValue.split("  ")[attrValue.split("  ").length - 1];
          containsFlag = true;
        }
        if (attrValue.includes("'")) {
          tempXpath =
            tagFormat +
            '" and contains(@' +
            attr +
            ',"' +
            attrValue +
            '")]' +
            tempXpath;
        } else {
          tempXpath =
            tagFormat +
            "' and contains(@" +
            attr +
            ",'" +
            attrValue +
            "')]" +
            tempXpath;
        }
        var totalMatch = _document.evaluate(
          tempXpath,
          _document,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
        ).snapshotLength;
        if (totalMatch === 1) {
          return tempXpath;
        }
      } else if (
        attrValue == null ||
        attrValue == "" ||
        attr.includes("xpath")
      ) {
        tempXpath = tagFormat + "'" + tempXpath;
        var totalMatch = _document.evaluate(
          tempXpath,
          _document,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
        ).snapshotLength;
        if (totalMatch === 1) {
          return tempXpath;
        }
      }
    }
  } else {
    tempXpath = tagFormat + "']" + tempXpath;
    var totalMatch = _document.evaluate(
      tempXpath,
      _document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    ).snapshotLength;
    if (totalMatch === 1) {
      return tempXpath;
    }
  }
  var ix = 0;
  var siblings = element.parentNode.childNodes;
  for (var i = 0; i < siblings.length; i++) {
    var sibling = siblings[i];
    if (sibling === element) {
      indexes.push(ix + 1);
      tempXpath = buildRelXpathForSVG(_document, element.parentNode);
      if (!tempXpath.includes("/")) {
        return tempXpath;
      } else {
        var totalMatch = _document.evaluate(
          tempXpath,
          _document,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
        ).snapshotLength;
        if (totalMatch === 1) {
          return tempXpath;
        } else {
          var svgChildsWithIndexes = absXpath.split("/*");
          var svgChildsWithoutIndexes = tempXpath.split("/*");
          for (var j = svgChildsWithIndexes.length - 1; j > 0; j--) {
            tempXpath = tempXpath.replace(
              svgChildsWithoutIndexes[j],
              svgChildsWithIndexes[j]
            );
            var totalMatch = _document.evaluate(
              tempXpath,
              _document,
              null,
              XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
              null
            ).snapshotLength;
            if (totalMatch === 1) {
              return tempXpath;
            }
          }
        }
      }
    }
    if (
      sibling.nodeType === 1 &&
      sibling.nodeName.toLowerCase() === element.nodeName.toLowerCase()
    ) {
      ix++;
    }
  }
}

var eventHandlers = {};

function addListenersForStudio(handlerName, eventName, handler, options) {
  handler.handlerName = handlerName;
  if (!options) options = false;
  let key = options ? "C_" + eventName : eventName;
  if (!eventHandlers[key]) {
    eventHandlers[key] = [];
  }
  eventHandlers[key].push(handler);
}

function parseEventKey(eventKey) {
  if (eventKey.match(/^C_/)) {
    return { eventName: eventKey.substring(2), capture: true };
  } else {
    return { eventName: eventKey, capture: false };
  }
}

function attachEvents() {
  if (this.attached) {
    return;
  }
  this.attached = true;
  this.eventListeners = {};
  var self = this;
  for (let eventKey in eventHandlers) {
    var eventInfo = parseEventKey(eventKey);
    var eventName = eventInfo.eventName;
    var capture = eventInfo.capture;

    // create new function so that the variables have new scope.
    function register() {
      var handlers = eventHandlers[eventKey];
      var listener = function (event) {
        for (var i = 0; i < handlers.length; i++) {
          handlers[i].call(self, event);
        }
      };
      this.window.document.addEventListener(eventName, listener, capture);
      this.eventListeners[eventKey] = listener;

      var iframes = document.getElementsByTagName("iframe");
      if (iframes) {
        for (var i = 0; i < iframes.length; i++) {
          if (iframes[i].contentDocument) {
            iframes[i].contentDocument.addEventListener(
              eventName,
              listener,
              capture
            );
          }
        }
      }
    }

    register.call(this);
    browser.runtime.sendMessage(chrome.runtime.id, {
      data: ``,
      message: "AttachStudio",
    });
  }
}

function deattachEvents() {
  if (!this.attached) {
    return;
  }
  this.attached = false;
  for (let eventKey in this.eventListeners) {
    var eventInfo = parseEventKey(eventKey);
    var eventName = eventInfo.eventName;
    var capture = eventInfo.capture;
    this.window.document.removeEventListener(
      eventName,
      this.eventListeners[eventKey],
      capture
    );
  }
  delete this.eventListeners;
}

// function attachEvents() {
//     console.log("Recorder Attached")
//     for(key in captureEvents) {
//         window.addEventListener(key, events[key]);
//     }
//     browser.runtime.sendMessage(chrome.runtime.id, {
//         data: ``,
//         message: 'AttachStudio',
//     });
// };

// function deattachEvents() {
//     console.log("Recorder Deattached")
//     for(key in captureEvents) {
//         window.removeEventListener(key, events[key]);
//     }
//     browser.runtime.sendMessage(chrome.runtime.id, {
//         data: ``,
//         message: 'DeattachStudio',
//     });
// };

//below code is commented for tcs
// window.onload = function () {
//     browser.runtime.sendMessage(chrome.runtime.id, {
//         type: 'verification',
//         data: []
//     });
// };

function isAlphaNumeric(value) {
  var regAlpha = /[a-zA-Z]/; //regex to check if there is only alphabates in string
  var regNum = /\d/; //regex to check if there is any digit in string
  if ((regAlpha.test(value) && regNum.test(value)) || regNum.test(value)) {
    return true;
  } else {
    return false;
  }
}

var recorderCommands = {
  addSelection: "select",
  clickAt: "Click on",
  doubleClickAt: "Double click on",
  rightClick: "Right click on",
  select: "select",
  sendKeys: "Press Enter Key",
  submit: "Press Enter Key",
  type: "Enter ",
};
function record(command, target, value = "", neglectXpath) {
  if (neglectXpath) {
    browser.runtime.sendMessage(chrome.runtime.id, {
      data: recorderCommands[command],
      type: "windowEvent",
      URL: window.location.href,
      dataText: "",
      relXpath: "",
      relCss: "",
    });
    return false;
  }

  var label = createSelectorName(target);

  try {
    relXpath = createRelXpath(target, attrArr);
  } catch (e) {
    try {
      relXpath = createAbsXpath(target);
    } catch (e) {
      return false;
    }
  }
  var relCss = "";
  try {
    relCss = createCssSelector(target, attrArr);
  } catch (e) {}
  var valueForTestRigor = value; //this will have password in value
  value = target.getAttribute("type") == "password" ? "******" : value;

  var valueWithInto = value ? '"' + value + '" into ' : "";

  if (label) {
    label = label.slice(0, 30);
    browser.runtime.sendMessage(chrome.runtime.id, {
      data: `${recorderCommands[command] + valueWithInto + ' "' + label + '"'}`,
      type: "windowEvent",
      URL: window.location.href,
      dataText: value,
      relXpath: relXpath ? relXpath[0] : "",
      relCss: relCss ? relCss[0] : "",
      planeLabel: label,
    });
  }
}

var allIframes = {};
var iframeIndex = 0;
function getAlliframe(doc) {
  allIframes["doc" + iframeIndex] = doc;
  var totalFrames = [];
  //allIframes["iframe"+iframeIndex] = doc.querySelectorAll("iframe");
  var iframes = doc.querySelectorAll("iframe");
  var frames = doc.querySelectorAll("frame");

  if (iframes.length > 0 && frames.length > 0) {
    totalFrames = iframes.concat(frames);
  } else if (iframes.length > 0) {
    totalFrames = iframes;
  } else {
    totalFrames = frames;
  }
  allIframes["iframe" + iframeIndex] = totalFrames;
  for (var i = 0; i < totalFrames.length; i++) {
    var tempIframe = totalFrames[i];
    try {
      if (
        tempIframe.contentWindow.document.querySelector("iframe") ||
        tempIframe.contentWindow.document.querySelector("frame")
      ) {
        iframeIndex = iframeIndex + 1;
        getAlliframe(tempIframe.contentWindow.document);
      }
    } catch (err) {}
  }
}

var parentiframeXpath = [];
var iframeXPathFlag = false;

function getIframeXpath(doc) {
  getAlliframe(document);
  // if(Object.keys(allIframes).length == 0){
  //     getAlliframe(document);
  // }
  // var  allIframes= document.querySelectorAll(frameOriframe);
  var iframeDoc = doc;
  var numOfIframes = Object.keys(allIframes).length;
  var iframeParentDoc = "";
  for (var j = 0; j < numOfIframes; j++) {
    var tempIframes = allIframes["iframe" + j];
    iframeParentDoc = allIframes["doc" + j];

    for (var i = 0; i < tempIframes.length; i++) {
      if (tempIframes[i].contentDocument == doc) {
        _document = iframeParentDoc;
        var iframeXpath = "";
        iframeXPathFlag = true;
        iframeXpath = createRelXpath(
          tempIframes[i],
          ",withid,withclass,withname,withplaceholder,withtext"
        );

        // if(elementInShadowDom){
        //     iframeXpath = createCssSelector(tempIframes[i],",withid,withclass,withname,withplaceholder,withtext");
        // }else{
        //     iframeXpath = createRelXpath(tempIframes[i],",withid,withclass,withname,withplaceholder,withtext");
        // }
        iframeXPathFlag = false;
        if (parentiframeXpath.length == 0) {
          _document = iframeDoc; //assigning back tha _document same as iframe doc
        }
        if (iframeParentDoc != document) {
          parentiframeXpath.push(getIframeXpath(iframeParentDoc)[0]);
        }
        return iframeXpath;
      }
    }
  }
}

function getIframeSelector(doc) {
  var allIframes = document.querySelectorAll(frameOriframe);
  var iframeDoc = doc;
  for (var i = 0; i < allIframes.length; i++) {
    if (allIframes[i].contentDocument == doc) {
      var iframeSelector = createCssSelector(
        allIframes[i],
        ",withid,withclass,withname,withplaceholder,withtext"
      );
      _document = iframeDoc; //assigning back tha _document same as iframe doc
      return iframeSelector;
    }
  }
}

function isAttributeDynamic(xpath, attr) {
  var conatinsRegex = new RegExp("@" + attr + ",'(.*?)'", "g");
  var equalRegex = new RegExp("@+" + attr + "+='(.*?)'", "g");
  var containsMatch = xpath.match(conatinsRegex);
  var equalMatch = xpath.match(equalRegex);
  return isAlphaNumeric(containsMatch) ? true : isAlphaNumeric(equalMatch);
}

var typeTarget;
var typeLock = 0;
var eventCaptured = 0;
var prevTargetElement = null;

var inputTypes = [
  "text",
  "password",
  "file",
  "datetime",
  "datetime-local",
  "date",
  "month",
  "time",
  "week",
  "number",
  "range",
  "email",
  "url",
  "search",
  "tel",
  "color",
];
addListenersForStudio("type", "change", function (event) {
  if (
    event.target.nodeName &&
    !preventType &&
    typeLock == 0 &&
    (typeLock = 1)
  ) {
    // END
    prevTargetElement = event.target;
    var tagName = event.target.nodeName.toLowerCase();
    var type = event.target.type;
    if ("input" == tagName && inputTypes.indexOf(type) >= 0) {
      if (event.target.value.length > 0) {
        record("type", event.target, event.target.value);
        eventCaptured = 1;
        if (enterTarget != null) {
          var tempTarget = event.target.parentElement;
          var formChk = tempTarget.nodeName.toLowerCase();
          while (formChk != "form" && formChk != "body") {
            tempTarget = tempTarget.parentElement;
            formChk = tempTarget.nodeName.toLowerCase();
          }
          if (
            formChk == "form" &&
            (tempTarget.hasAttribute("id") ||
              tempTarget.hasAttribute("name")) &&
            !tempTarget.hasAttribute("onsubmit")
          ) {
            record("sendKeys", enterTarget, null, true);
          } else record("sendKeys", enterTarget, null, true);
          enterTarget = null;
        }
        // END
      } else {
        record("type", event.target, event.target.value);
      }
    } else if ("textarea" == tagName) {
      record("type", event.target, event.target.value);
    }
  }
  typeLock = 0;
});

addListenersForStudio("type", "input", function (event) {
  typeTarget = event.target;
});

var preventClickTwice = false;
var clickCounter = 0;

addListenersForStudio(
  "clickAt",
  "click",
  function (event) {
    eventCaptured = 0;
    clickCounter++;

    if (event.button == 0 && !preventClick && event.isTrusted) {
      if (!preventClickTwice && clickCounter === 1) {
        var top = event.pageY,
          left = event.pageX;
        var element = event.target;
        do {
          top -= element.offsetTop;
          left -= element.offsetLeft;
          element = element.offsetParent;
        } while (element);
        var target = event.target;
        var attrType = target.getAttribute("type");
        var parentTag = target.parentNode.nodeName;
        for (var i = 0; i < 3; i++) {
          try {
            var tempParent = target.parentNode;
            if (tempParent.nodeName == "FORM") {
              parentTag = tempParent.nodeName;
            }
          } catch (err) {}
        }

        if (
          (target.nodeName == "INPUT" || target.nodeName == "SELECT") &&
          (attrType == "text" ||
            attrType == "email" ||
            attrType == "password" ||
            attrType == "tel" ||
            attrType == "number" ||
            (parentTag == "FORM" && !attrType) ||
            target.nodeName == "FORM" ||
            target.nodeName == "BODY") &&
          attrType != "radio" &&
          attrType != "checkbox" &&
          attrType != "button"
        ) {
        } else {
          prevTargetElement = event.target;
          record("clickAt", event.target);
        }
        preventClickTwice = true;
      }
      setTimeout(function () {
        preventClickTwice = false;
        clickCounter = 0;
      }, 200);
    }
  },
  true
);
//END

addListenersForStudio(
  "doubleClickAt",
  "dblclick",
  function (event) {
    clickCounter = 0;
    var element = event.target;
    if (
      /*element.nodeName == "LABEL" || */ element.nodeName == "FORM" ||
      element.nodeName == "BODY"
    ) {
    } else {
      record("doubleClickAt", event.target);
    }
  },
  true
);

var focusTarget = null;
var focusValue = null;
var tempValue = null;
var preventType = false;
var inp = document.getElementsByTagName("input");
for (var i = 0; i < inp.length; i++) {
  if (inputTypes.indexOf(inp[i].type) >= 0) {
    inp[i].addEventListener("focus", function (event) {
      focusTarget = event.target;
      focusValue = focusTarget.value;
      tempValue = focusValue;
      preventType = false;
    });
    inp[i].addEventListener("blur", function (event) {
      focusTarget = null;
      focusValue = null;
      tempValue = null;
    });
  }
}

var preventClick = false;
var enterTarget = null;
var varenterValue = null;
var tabCheck = null;
addListenersForStudio(
  "sendKeys",
  "keydown",
  function (event) {
    if (event.target.nodeName) {
      var key = event.keyCode;
      var tagName = event.target.nodeName.toLowerCase();
      var type = event.target.type;
      if (tagName == "input" && inputTypes.indexOf(type) >= 0) {
        prevTargetElement = event.target;
        if (key == 13) {
          enterTarget = event.target;
          enterValue = enterTarget.value;
          var tempTarget = event.target.parentElement;
          var formChk = tempTarget.nodeName.toLowerCase();
          if (tempValue == enterTarget.value && tabCheck == enterTarget) {
            record("sendKeys", enterTarget, null, true);
            enterTarget = null;
            preventType = true;
          } else if (focusValue == enterTarget.value) {
            while (formChk != "form" && formChk != "body") {
              tempTarget = tempTarget.parentElement;
              formChk = tempTarget.nodeName.toLowerCase();
            }
            if (
              formChk == "form" &&
              (tempTarget.hasAttribute("id") ||
                tempTarget.hasAttribute("name")) &&
              !tempTarget.hasAttribute("onsubmit")
            ) {
              if (tempTarget.hasAttribute("id"))
                record("submit", "id=" + tempTarget.id, "", true);
              else if (tempTarget.hasAttribute("name"))
                record("submit", "name=" + tempTarget.name, "", true);
            } else record("sendKeys", enterTarget, null, true);
            enterTarget = null;
          }
          if (typeTarget.nodeName && !preventType && (typeLock = 1)) {
            // END
            var tagName = typeTarget.nodeName.toLowerCase();
            var type = typeTarget.type;
            if ("input" == tagName && inputTypes.indexOf(type) >= 0) {
              if (typeTarget.value.length > 0) {
                record("type", typeTarget, typeTarget.value);
                if (enterTarget != null) {
                  var tempTarget = typeTarget.parentElement;
                  var formChk = tempTarget.nodeName.toLowerCase();
                  while (formChk != "form" && formChk != "body") {
                    tempTarget = tempTarget.parentElement;
                    formChk = tempTarget.nodeName.toLowerCase();
                  }
                  if (
                    formChk == "form" &&
                    (tempTarget.hasAttribute("id") ||
                      tempTarget.hasAttribute("name")) &&
                    !tempTarget.hasAttribute("onsubmit")
                  ) {
                    if (tempTarget.hasAttribute("id"))
                      record(
                        "submit",
                        [["id=" + tempTarget.id, "id"]],
                        "",
                        true
                      );
                    else if (tempTarget.hasAttribute("name"))
                      record(
                        "submit",
                        [["name=" + tempTarget.name, "name"]],
                        "",
                        true
                      );
                  } else record("sendKeys", enterTarget, null, true);
                  enterTarget = null;
                }
                // END
              } else {
                record("type", typeTarget, typeTarget.value);
              }
            } else if ("textarea" == tagName) {
              record("type", typeTarget, typeTarget.value);
            }
          }
          preventClick = true;
          setTimeout(function () {
            preventClick = false;
          }, 500);
          setTimeout(function () {
            if (enterValue != event.target.value) enterTarget = null;
          }, 50);
        }

        var tempbool = false;
        if ((key == 38 || key == 40) && event.target.value != "") {
          if (focusTarget != null && focusTarget.value != tempValue) {
            tempbool = true;
            tempValue = focusTarget.value;
          }
          if (tempbool) {
            record("type", event.target, tempValue);
          }

          setTimeout(function () {
            tempValue = focusTarget.value;
          }, 250);

          if (key == 38) record("sendKeys", event.target, "", true);
          else record("sendKeys", event.target, "", true);
          tabCheck = event.target;
        }
        if (key == 9) {
          if (tabCheck == event.target) {
            record("sendKeys", event.target, "", true);
            preventType = true;
          }
        }
      }
    }
  },
  true
);

addListenersForStudio(
  "contextMenu",
  "contextmenu",
  function (event) {
    var element = event.target;
    if (
      /*element.nodeName == "LABEL" || */ element.nodeName == "FORM" ||
      element.nodeName == "BODY"
    ) {
    } else {
      record("rightClick", event.target);
    }
  },
  true
);
// END

var checkFocus = 0;
addListenersForStudio(
  "editContent",
  "focus",
  function (event) {
    var editable = event.target.contentEditable;
    if (editable == "true") {
      getEle = event.target;
      contentTest = getEle.innerHTML;
      checkFocus = 1;
    }
  },
  true
);
// END

//below code is commented for tcs
// browser.runtime.sendMessage({
//     attachStudioRequest: true
// }).catch(function(reason){
//     // Failed silently if receiveing end does not exist
// });

function getOptionSelector(option) {
  var label = option.text.replace(/^ *(.*?) *$/, "$1");
  if (label.match(/\xA0/)) {
    // if the text contains &nbsp;
    return (
      "label=regexp:" +
      label
        .replace(/[\(\)\[\]\\\^\$\*\+\?\.\|\{\}]/g, function (str) {
          return "\\" + str;
        })
        .replace(/\s+/g, function (str) {
          if (str.match(/\xA0/)) {
            if (str.length > 1) {
              return "\\s+";
            } else {
              return "\\s";
            }
          } else {
            return str;
          }
        })
    );
  } else {
    return label;
  }
}

/**
 * Replace multiple sequential spaces with a single space, and then convert &nbsp; to space.
 */
//self
function normalizeSpaces(text) {
  // IE has already done this conversion, so doing it again will remove multiple nbsp
  if (browserVersion.isIE) {
    return text;
  }

  // Replace multiple spaces with a single space
  // TODO - this shouldn"t occur inside PRE elements
  text = text.replace(/\ +/g, " ");

  // Replace &nbsp; with a space
  var nbspPattern = new RegExp(String.fromCharCode(160), "g");
  if (browserVersion.isSafari) {
    return replaceAll(text, String.fromCharCode(160), " ");
  } else {
    return text.replace(nbspPattern, " ");
  }
}

/**
 * Convert all newlines to \n
 */
//self
function normalizeNewlines(text) {
  return text.replace(/\r\n|\r/g, "\n");
}

function findClickableWebElement(e) {
  if (!e.nodeName) return null;
  var tagName = e.nodeName.toLowerCase();
  var type = e.type;
  if (
    e.hasAttribute("onclick") ||
    e.hasAttribute("href") ||
    tagName == "button" ||
    (tagName == "input" &&
      (type == "submit" ||
        type == "button" ||
        type == "image" ||
        type == "radio" ||
        type == "checkbox" ||
        type == "reset"))
  ) {
    return e;
  } else {
    if (e.parentNode != null) {
      return findClickableWebElement(e.parentNode);
    } else {
      return null;
    }
  }
}
//select / addSelect / removeSelect
addListenersForStudio(
  "select",
  "focus",
  function (event) {
    if (event.target.nodeName) {
      var tagName = event.target.nodeName.toLowerCase();
      if ("select" == tagName && event.target.multiple) {
        var options = event.target.options;
        for (var i = 0; i < options.length; i++) {
          if (options[i]._wasSelected == null) {
            // is the focus was gained by mousedown event, _wasSelected would be already set
            options[i]._wasSelected = options[i].selected;
          }
        }
      }
    }
  },
  true
);

addListenersForStudio("select", "change", function (event) {
  if (event.target.nodeName) {
    var tagName = event.target.nodeName.toLowerCase();
    if ("select" == tagName) {
      prevTargetElement = event.target;
      if (!event.target.multiple) {
        var option = event.target.options[event.target.selectedIndex];
        record("select", event.target, getOptionSelector(option));
      } else {
        var options = event.target.options;
        for (var i = 0; i < options.length; i++) {
          if (options[i]._wasSelected != options[i].selected) {
            var value = getOptionSelector(options[i]);
            if (options[i].selected) {
              record("addSelection", event.target, value, true);
            } else {
              record("removeSelection", event.target, value, true);
            }
            options[i]._wasSelected = options[i].selected;
          }
        }
      }
    }
  }
});

function getText(element) {
  var text = "";

  var isRecentFirefox =
    browserVersion.isFirefox && browserVersion.firefoxVersion >= "1.5";
  if (
    isRecentFirefox ||
    browserVersion.isKonqueror ||
    browserVersion.isSafari ||
    browserVersion.isOpera
  ) {
    text = getTextContent(element);
  } else if (element.textContent) {
    text = element.textContent;
  } else if (element.innerText) {
    text = element.innerText;
  }

  text = normalizeNewlines(text);
  text = normalizeSpaces(text);

  return text.trim();
}

//self
function getTextContent(element, preformatted) {
  if (
    element.style &&
    (element.style.visibility == "hidden" || element.style.display == "none")
  )
    return "";
  if (element.nodeType == 3 /*Node.TEXT_NODE*/) {
    var text = element.data;
    if (!preformatted) {
      text = text.replace(/\n|\r|\t/g, " ");
    }
    return text;
  }
  if (
    element.nodeType == 1 /*Node.ELEMENT_NODE*/ &&
    element.nodeName != "SCRIPT"
  ) {
    var childrenPreformatted = preformatted || element.nodeName == "PRE";
    var text = "";
    for (var i = 0; i < element.childNodes.length; i++) {
      var child = element.childNodes.item(i);
      text += getTextContent(child, childrenPreformatted);
    }
    // Handle block elements that introduce newlines
    // -- From HTML spec:
    //<!ENTITY % block
    //     "P | %heading; | %list; | %preformatted; | DL | DIV | NOSCRIPT |
    //      BLOCKQUOTE | F:wORM | HR | TABLE | FIELDSET | ADDRESS">
    //
    // TODO: should potentially introduce multiple newlines to separate blocks
    if (
      element.nodeName == "P" ||
      element.nodeName == "BR" ||
      element.nodeName == "HR" ||
      element.nodeName == "DIV"
    ) {
      text += "\n";
    }
    return text;
  }
  return "";
}

function getInspectedElement() {
  var element = _document.querySelector("*[xpathtest]");
  if (element) {
    setTimeout(function () {
      element.removeAttribute("xpathtest");
    }, 2);
  }
  return element;
}

var globalRelXpath = "";

function onInspectElementClick(element, chooseAttrs, hubMode) {
  var relXpathWithCount = "";
  var absXpathWithCount = "";
  var indexXpathWithCount = "";
  var cssSelectorWithCount = "";
  var linkTextWithCount = "";
  var partialLinkTextWithCount = "";
  var idWithCount = "";
  var classNameWithCount = "";
  var nameWithCount = "";
  var tagNameWithCount = "";
  var label = "";
  var testRigorWithCount = "";
  shadowDOMOpenOrClosed = "open";
  //getDocument();
  elementInShadowDom = isInShadow(element);

  var nodeName = "";
  try {
    nodeName = element.nodeName.toLowerCase();
  } catch (err) {}

  if (_document == "" || nodeName == "") {
    relXpathWithCount = [
      "Element inside cross-origin iframe. Copy Selectors by right click on element or open iframe src url in new tab.",
      "0",
    ];
    // }else if(nodeName.includes("style")){
    //     relXpathWithCount = ["This is a "+nodeName+" tag. For "+nodeName+" tag, no need to write Selectors. :P","0"];
  } else if (nodeName.includes("#comment")) {
    relXpathWithCount = [
      "This is a comment and selectors can't be generated for comment.",
      "0",
    ];
  } else if (nodeName.includes("::")) {
    relXpathWithCount = [
      "This is a pseudo element and selectors will be generated for it's parentElement.",
      "0",
    ];
  } else {
    //var element = getInspectedElement();
    // element = _document.querySelector("*[xpathtest]");
    // setTimeout(function(){
    //         element.removeAttribute("xpathtest");
    //     }, 5);

    absXpathWithCount = createAbsXpath(element);
    absXpath = absXpathWithCount[0];
    relXpathWithCount = createRelXpath(element, chooseAttrs);
    globalRelXpath = relXpathWithCount[0];
    indexXpathWithCount = createXPathWithIndex(element, chooseAttrs);
    try {
      cssSelectorWithCount = createCssSelector(element, chooseAttrs);
    } catch (err) {}
    idWithCount = createIdSelector(element);
    nameWithCount = createNameSelector(element);
    classNameWithCount = createClassNameSelector(element);
    if (element.nodeName.toLowerCase() === "a") {
      linkTextWithCount = createLinkTextSelector(element);
      partialLinkTextWithCount = createPartialLinkTextSelector(element);
    }

    //prepareListOfAttrText(element);
    tagNameWithCount = createTagNameSelector(element);

    if (hubMode == "generatorAndEditorRecording" && element) {
      label = createSelectorName(element);
    }

    if (elementInShadowDom) {
      var allHostsSelectors = getAllShadowHost(element, chooseAttrs);
      elementInShadowDom = true;
    }

    testRigorWithCount = createTestRigorPath(element);
  }

  var xpath = [];
  xpath.push(relXpathWithCount);
  xpath.push(cssSelectorWithCount);
  xpath.push(indexXpathWithCount);
  xpath.push(idWithCount);
  xpath.push(nameWithCount);
  xpath.push(classNameWithCount);
  xpath.push(linkTextWithCount);
  xpath.push(partialLinkTextWithCount);
  xpath.push(absXpathWithCount);
  xpath.push(tagNameWithCount);
  xpath.push(label);
  xpath.push(allHostsSelectors);
  xpath.push(testRigorWithCount); //add testRigor Path

  //generate playwright locators
  let pwLoc = generatePlaywrightSelectors(element);
  console.log(pwLoc);
  xpath.push(pwLoc);

  if (isFirefox) {
    chrome.runtime.sendMessage({
      showInspected: true,
      xpath: xpath,
    });
  } else {
    return xpath;
  }
}

var allShadowDomChildNodes = [];
var node = "";
function replaceShadowDomsWithHtml(rootElement) {
  for (let el of rootElement.querySelectorAll("*")) {
    if (el.shadowRoot) {
      if (el.shadowRoot.querySelector("*[xpathtest='1']")) {
        node = el.shadowRoot.querySelector("*[xpathtest='1']");
        setTimeout(function () {
          node.removeAttribute("xpathtest");
        }, 5);
        return node;
      }
      replaceShadowDomsWithHtml(el.shadowRoot);
    }
  }
  return node;
}

var hostShadowDom = false;
function getAllShadowHost(node, chooseAttrs) {
  var tempInspectedElement = node;
  var shadowHost = (node && node.parentNode).getRootNode().host;
  var allShadowHost = [];
  while (shadowHost) {
    hostShadowDom = true;
    elementInShadowDom = isInShadow(shadowHost);
    allShadowHost.push(createCssSelector(shadowHost, chooseAttrs)[0]);
    //allShadowHost.push(shadowHost);
    shadowHost = (shadowHost && shadowHost.parentNode).getRootNode().host;
  }
  inspectedElement = tempInspectedElement;
  return allShadowHost;
}

function executeJs(scriptValue) {
  var res = [];
  var totalMatch = 0;
  if (scriptValue != null && scriptValue.length) {
    totalMatch = scriptValue.length; //css
    for (var i = 0; i < totalMatch; i++) {
      res.push(scriptValue[i].outerHTML);
    }
  } else if (scriptValue != null) {
    res.push(scriptValue.outerHTML);
  }
  return res;
}

function getPageUrl() {
  return window.location.hostname;
}

function getFormattedTime() {
  var today = new Date();
  var y = today.getFullYear();
  // JavaScript months are 0-based.
  var m = today.getMonth() + 1;
  var d = today.getDate();
  var h = today.getHours();
  var mi = today.getMinutes();
  var s = today.getSeconds();
  return y + "-" + m + "-" + d + "-" + h + "-" + mi + "-" + s;
}

function findCommonParent(parent, child) {
  var parentLevel = "/..";
  while (!parent.parentElement.contains(child)) {
    parent = parent.parentElement;
    parentLevel = parentLevel + "/..";
  }
  // return parent.parentElement;
  return parentLevel;
}

var referenceElement = "";
var xpathElement = "";

function createXpathForReferenceElement(referenceElement) {
  return createRelXpath(referenceElement, chooseAttrs)[0];
}

function assignParentElement(parentElement) {
  referenceElement = parentElement;
}

function getRelationship(parentElement, childElement) {
  var position = parentElement.compareDocumentPosition(childElement);
  position =
    position == 2
      ? "//preceding::"
      : position == 4
      ? "//following::"
      : position;
  return position;
}

function createAxesXpathForElement(xpathElement) {
  var axesXpath = "";
  var totalMatch = 0;
  if (isInShadow(xpathElement)) {
    axesXpath =
      "This element is inside Shadow DOM & for such elements XPath won't support.";
    axesXpath = shadowDOMOpenOrClosed.includes("closed")
      ? "This element is inside closed Shadow DOM which is inaccessible so for such elements we can't verify/write selectors."
      : absXpath;
  } else {
    var xpathForReferenceElement = createRelXpath(
      referenceElement,
      chooseAttrsForXpath
    )[0];

    var relation = getRelationship(referenceElement, xpathElement);
    var xpathForChild = buildXPathForElement(
      _document,
      xpathElement,
      chooseAttrsForXpath
    );
    var xpathForChildWithoutSlash = xpathForChild.replace("/", "");
    xpathForChildWithoutSlash =
      xpathForChildWithoutSlash.charAt(0) === "/"
        ? xpathForChildWithoutSlash.replace("/", "")
        : xpathForChildWithoutSlash;

    if (relation == "//preceding::" || relation == "//following::") {
      axesXpath =
        xpathForReferenceElement + relation + xpathForChildWithoutSlash;
      totalMatch = _document.evaluate(
        axesXpath,
        _document,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      ).snapshotLength;
    }

    if (totalMatch != 1) {
      var commonParent = findCommonParent(referenceElement, xpathElement);
      //var commonParentXpath = createRelXpath(commonParent, chooseAttrsForXpath)[0];
      //commonParentXpath = commonParentXpath.replace('/','');
      //commonParentXpath = commonParentXpath.charAt(0)==='/' ? commonParentXpath.replace("/",'') : commonParentXpath;
      //var parentXPathWithReference = xpathForReferenceElement + "//ancestor::" + commonParentXpath;
      //axesXpath = parentXPathWithReference + xpathForChild;
      axesXpath = xpathForReferenceElement + commonParent + xpathForChild;
    }
    totalMatch = _document.evaluate(
      axesXpath,
      _document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    ).snapshotLength;
  }

  referenceElement = "";
  xpathElement = "";

  var result = [];
  result.push(axesXpath);
  result.push(totalMatch);

  if (isFirefox) {
    chrome.runtime.sendMessage({
      axesXpathWithCount: result,
    });
  } else {
    return result;
  }
}

function buildXPathForElement(_document, element, chooseAttrsForXpath) {
  var tempXpath = "";
  var userAttr = chooseAttrsForXpath[0];
  var doubleSpaceOrJunk = false;
  var tagName = element.nodeName.toLowerCase();

  //this will give only parent text, not the child node text
  var innerText = tagName.includes("body")
    ? ""
    : [].reduce
        .call(
          element.childNodes,
          function (a, b) {
            return a + (b.nodeType === 3 ? b.textContent : "");
          },
          ""
        )
        .trim();

  if (
    innerText.includes("  ") ||
    innerText.includes("\n") ||
    innerText.match(/[^\u0000-\u00ff]/)
  ) {
    doubleSpaceOrJunk = true;
  }
  if (innerText.includes("  ") || innerText.includes("\n")) {
    innerText = deleteGarbageFromInnerText(innerText);
  }

  if (element.tagName.toLowerCase() === "svg" || isSVGChild(element)) {
    tagName = "*[name()='" + tagName + "']";
  }

  if (innerText.includes("'")) {
    innerText = innerText.split("  ")[0];
    dotText = '[contains(.,"' + innerText + '")]';
    equalsText = '[normalize-space()="' + innerText + '"]';

    if (innerText.length > 50 || doubleSpaceOrJunk) {
      containsText = '[contains(text(),"' + innerText.slice(0, 50) + '")]';
      equalsText = containsText;
    } else {
      containsText = '[normalize-space()="' + innerText + '"]';
      equalsText = containsText;
    }
  } else {
    innerText = innerText.split("  ")[0];
    dotText = "[contains(.,'" + innerText + "')]";
    equalsText = "[normalize-space()='" + innerText + "']";

    if (innerText.length > 50 || doubleSpaceOrJunk) {
      containsText = "[contains(text(),'" + innerText.slice(0, 50) + "')]";
      equalsText = containsText;
    } else {
      containsText = "[normalize-space()='" + innerText + "']";
      equalsText = containsText;
    }
  }

  if (chooseAttrsForXpath.includes("withouttext") || generateCssSelectorFlag) {
    innerText = "";
  }

  if (
    innerText &&
    (tagName == "a" ||
      tagName == "button" ||
      tagName == "label" ||
      tagName.charAt(0) == "h")
  ) {
    var equalsXpath = "//" + tagName + equalsText;
    var totalMatch = _document.evaluate(
      equalsXpath,
      _document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    ).snapshotLength;
    if (totalMatch === 1) {
      var dotXpath = "//" + tagName + dotText;
      var totalMatch = _document.evaluate(
        dotXpath,
        _document,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      ).snapshotLength;
      if (totalMatch === 1) {
        return equalsXpath;
      } else {
        var firstText = element.firstChild.textContent;
        firstText = deleteGarbageFromInnerText(firstText);
        var containsfirstText = "[normalize-space()='" + firstText + "']";
        var containsfirstXpath = "//" + tagName + containsfirstText;
        totalMatch = _document.evaluate(
          containsfirstXpath,
          _document,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
        ).snapshotLength;
        if (totalMatch === 1) {
          return containsfirstXpath;
        }
      }
    }
  }

  if (tagName.includes("html") || tagName.includes("body")) {
    return "//" + tagName + tempXpath;
  }
  var attr = "";
  var attrValue = "";
  var listOfAttr = {};

  if (!attrValue) {
    for (var i = 0; i < element.attributes.length; i++) {
      var tempAttr = element.attributes[i].name;
      var tempAttrValue = element.attributes[i].nodeValue;
      // if (attrValue!=null && attrValue!="" && !attr.includes("style") && !attr.includes("id") && !attr.includes("xpath")  && (chooseAttrsForXpath.includes("with"+attr) || userAttr==attr)){
      if (
        tempAttrValue != null &&
        tempAttrValue != "" &&
        (tempAttr !== "style" || userAttr === "style") &&
        tempAttr !== "id" &&
        tempAttr !== "xpath" &&
        tempAttr !== "xpathtest" &&
        (!chooseAttrsForXpath.includes("without" + tempAttr) ||
          userAttr == tempAttr)
      ) {
        listOfAttr[tempAttr] = tempAttrValue;
      }
    }
  }
  var noOfUsefulAttr = Object.keys(listOfAttr).length;

  if (
    (!element.getAttribute(userAttr) || userAttr.toLowerCase() === "id") &&
    element.id !== "" &&
    (chooseAttrsForXpath.includes("withid") || userAttr.toLowerCase() === "id")
  ) {
    var id = element.id;
    id = deleteLineGap(id);
    tempXpath = "//" + tagName + "[@id='" + id + "']" + tempXpath;
    var totalMatch = _document.evaluate(
      tempXpath,
      _document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    ).snapshotLength;
    if (totalMatch === 1) {
      return tempXpath;
    } else {
      if (innerText && element.getElementsByTagName("*").length === 0) {
        var containsXpath = "//" + tagName + containsText + tempXpath;
        var totalMatch = _document.evaluate(
          containsXpath,
          _document,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
        ).snapshotLength;
        if (totalMatch === 0) {
          var equalsXpath = "//" + tagName + equalsText + tempXpath;
          var totalMatch = _document.evaluate(
            equalsXpath,
            _document,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
          ).snapshotLength;
          if (totalMatch === 1) {
            return equalsXpath;
          } else {
            tempXpath = tempXpath;
          }
        } else if (totalMatch === 1) {
          return containsXpath;
        } else {
          tempXpath = tempXpath;
        }
      } else {
        tempXpath = tempXpath;
      }
    }
  } else if (noOfUsefulAttr != 0) {
    var attrTempXpath = "";
    var attrTempXpath0 = "";
    for (var j = 0; j < noOfUsefulAttr; j++) {
      attrTempXpath = tempXpath;
      if (userAttr in listOfAttr) {
        attr = userAttr;
        attrValue = listOfAttr[attr];
      } else if ("placeholder" in listOfAttr) {
        attr = "placeholder";
        attrValue = listOfAttr[attr];
      } else if ("title" in listOfAttr) {
        attr = "title";
        attrValue = listOfAttr[attr];
      } else if ("name" in listOfAttr) {
        attr = "name";
        attrValue = listOfAttr[attr];
      } else if ("value" in listOfAttr) {
        attr = "value";
        attrValue = listOfAttr[attr];
      } else if ("aria-label" in listOfAttr) {
        attr = "aria-label";
        attrValue = listOfAttr[attr];
      } else if ("alt" in listOfAttr) {
        attr = "alt";
        attrValue = listOfAttr[attr];
      } else if ("for" in listOfAttr) {
        attr = "for";
        attrValue = listOfAttr[attr];
      } else if ("data-label" in listOfAttr) {
        attr = "data-label";
        attrValue = listOfAttr[attr];
      } else if ("date-fieldlabel" in listOfAttr) {
        attr = "date-fieldlabel";
        attrValue = listOfAttr[attr];
      } else if ("data-displaylabel" in listOfAttr) {
        attr = "data-displaylabel";
        attrValue = listOfAttr[attr];
      } else if ("role" in listOfAttr) {
        attr = "role";
        attrValue = listOfAttr[attr];
      } else if ("type" in listOfAttr) {
        attr = "type";
        attrValue = listOfAttr[attr];
      } else if ("class" in listOfAttr) {
        attr = "class";
        attrValue = listOfAttr[attr];
      } else {
        attr = Object.keys(listOfAttr)[0];
        attrValue = listOfAttr[attr];
        if (isAlphaNumeric(attrValue)) {
          attr = "";
          attrValue = "";
        }
      }
      attrValue = deleteLineGap(attrValue); //sometime there is linespace in value so taking value before linespace.
      delete listOfAttr[attr];
      if (attrValue != null && attrValue != "" && attr !== "shub-ins" &&
      attr !== "sh-att" && attr !== "xpath") {
        var xpathWithoutAttribute = "//" + tagName;
        var xpathWithAttributeWithoutTemp = "";
        var xpathWithAttributeWithTemp = "";

        if (attrValue.includes("  ")) {
          attrValue = attrValue.split("  ")[attrValue.split("  ").length - 1];
          containsFlag = true;
        }
        if (attrValue.includes("'")) {
          if (
            (attrValue.charAt(0) === " " ||
              attrValue.charAt(attrValue.length - 1) === " " ||
              containsFlag) &&
            !xpathForCss
          ) {
            xpathWithAttributeWithoutTemp =
              "//" +
              tagName +
              "[contains(@" +
              attr +
              ',"' +
              attrValue.trim() +
              '")]';
          } else {
            xpathWithAttributeWithoutTemp =
              "//" + tagName + "[@" + attr + '="' + attrValue + '"]';
          }
        } else {
          if (
            (attrValue.charAt(0) === " " ||
              attrValue.charAt(attrValue.length - 1) === " " ||
              containsFlag) &&
            !xpathForCss
          ) {
            xpathWithAttributeWithoutTemp =
              "//" +
              tagName +
              "[contains(@" +
              attr +
              ",'" +
              attrValue.trim() +
              "')]";
          } else {
            xpathWithAttributeWithoutTemp =
              "//" + tagName + "[@" + attr + "='" + attrValue + "']";
          }
        }
        xpathWithAttributeWithTemp =
          xpathWithAttributeWithoutTemp + attrTempXpath;

        var totalMatch = _document.evaluate(
          xpathWithAttributeWithTemp,
          _document,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
        ).snapshotLength;
        if (totalMatch === 1) {
          if (
            (xpathWithAttributeWithTemp.includes("@href") &&
              !userAttr.includes("href")) ||
            (xpathWithAttributeWithTemp.includes("@src") &&
              !userAttr.includes("src") &&
              innerText)
          ) {
            var containsXpath = "//" + tagName + containsText + attrTempXpath;
            var totalMatch = _document.evaluate(
              containsXpath,
              _document,
              null,
              XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
              null
            ).snapshotLength;
            if (totalMatch === 0) {
              var equalsXpath = "//" + tagName + equalsText + attrTempXpath;
              var totalMatch = _document.evaluate(
                equalsXpath,
                _document,
                null,
                XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                null
              ).snapshotLength;
              if (totalMatch === 1) {
                return equalsXpath;
              }
            } else if (totalMatch === 1) {
              return containsXpath;
            }
          }
          return xpathWithAttributeWithTemp;
          // }else if(innerText && element.getElementsByTagName('*').length===0){
          //this element.getElementsByTagName('*').length===0 check not required because innertext has only parent text.
        } else if (innerText) {
          var containsXpath = "//" + tagName + containsText + attrTempXpath;
          var totalMatch = _document.evaluate(
            containsXpath,
            _document,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
          ).snapshotLength;
          if (totalMatch === 0) {
            var equalsXpath = "//" + tagName + equalsText + attrTempXpath;
            var totalMatch = _document.evaluate(
              equalsXpath,
              _document,
              null,
              XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
              null
            ).snapshotLength;
            if (totalMatch === 1) {
              return equalsXpath;
            } else if (totalMatch > 1) {
              attrTempXpath = equalsXpath; //fix when contains text has comment too, like in react app
            } else if (totalMatch === 0) {
              attrTempXpath = xpathWithAttributeWithTemp;
            }
          } else if (totalMatch === 1) {
            var dotXpath = "//" + tagName + dotText + attrTempXpath;
            var totalMatch = _document.evaluate(
              dotXpath,
              _document,
              null,
              XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
              null
            ).snapshotLength;
            if (totalMatch === 1) {
              return containsXpath;
            } else {
              var firstText = element.firstChild.textContent;
              firstText = deleteGarbageFromInnerText(firstText);
              var containsfirstText = "[normalize-space()='" + firstText + "']";
              var containsfirstXpathWithoutAttr =
                "//" + tagName + containsfirstText + attrTempXpath;
              totalMatch = _document.evaluate(
                containsfirstXpathWithoutAttr,
                _document,
                null,
                XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                null
              ).snapshotLength;
              if (totalMatch === 1) {
                return containsfirstXpathWithoutAttr;
              } else {
                var containsfirstXpath =
                  xpathWithAttributeWithoutTemp +
                  containsfirstText +
                  attrTempXpath;
                totalMatch = _document.evaluate(
                  containsfirstXpath,
                  _document,
                  null,
                  XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                  null
                ).snapshotLength;
                if (totalMatch === 1) {
                  return containsfirstXpath;
                } else {
                  attrTempXpath = containsfirstXpath;
                }
              }
            }
          } else {
            containsXpath =
              "//" +
              tagName +
              "[contains(text(),'" +
              innerText.slice(0, 50) +
              "')]" +
              attrTempXpath;
            totalMatch = _document.evaluate(
              containsXpath,
              _document,
              null,
              XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
              null
            ).snapshotLength;
            if (totalMatch === 1) {
              return containsXpath;
            } else {
              containsXpath =
                xpathWithAttributeWithoutTemp + containsText + attrTempXpath;
              totalMatch = _document.evaluate(
                containsXpath,
                _document,
                null,
                XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                null
              ).snapshotLength;
              if (totalMatch === 0) {
                var equalsXpath =
                  xpathWithAttributeWithoutTemp + equalsText + attrTempXpath;
                var totalMatch = _document.evaluate(
                  equalsXpath,
                  _document,
                  null,
                  XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                  null
                ).snapshotLength;
                if (totalMatch === 1) {
                  return equalsXpath;
                }
              } else if (totalMatch === 1) {
                return containsXpath;
              } else if (attrValue.includes("/") || innerText.includes("/")) {
                if (attrValue.includes("/")) {
                  containsXpath =
                    xpathWithoutAttribute + containsText + attrTempXpath;
                }
                if (innerText.includes("/")) {
                  containsXpath = containsXpath.replace(containsText, "");
                }
                attrTempXpath = containsXpath;
              } else {
                attrTempXpath = containsXpath;
              }
            }
          }
        } else {
          attrTempXpath = xpathWithAttributeWithTemp;
          if (attrValue.includes("/")) {
            // attrTempXpath = "//" + tagName + xpathWithoutAttribute + attrTempXpath;
            attrTempXpath = "//" + tagName;
          }
        }
        // }else if(innerText && element.getElementsByTagName('*').length===0){
      } else if (innerText) {
        var containsXpath = "//" + tagName + containsText + attrTempXpath;
        var totalMatch = _document.evaluate(
          containsXpath,
          _document,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
        ).snapshotLength;
        if (totalMatch === 0) {
          var equalsXpath = "//" + tagName + equalsText + attrTempXpath;
          var totalMatch = _document.evaluate(
            equalsXpath,
            _document,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
          ).snapshotLength;
          if (totalMatch === 1) {
            return equalsXpath;
          }
        } else if (totalMatch === 1) {
          return containsXpath;
        } else {
          containsXpath =
            "//" +
            tagName +
            "[contains(text(),'" +
            innerText.slice(0, 50) +
            "')]" +
            attrTempXpath;
          totalMatch = _document.evaluate(
            containsXpath,
            _document,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
          ).snapshotLength;
          if (totalMatch === 1) {
            return containsXpath;
          }
        }
        attrTempXpath = containsXpath;
      } else if (
        attrValue == null ||
        attrValue == "" ||
        attr.includes("xpath")
      ) {
        attrTempXpath = "//" + tagName + attrTempXpath;
      }
      if (j == 0) {
        attrTempXpath0 = attrTempXpath;
      }
    }
    tempXpath = attrTempXpath0;
    // }else if(attrValue=="" && innerText && element.getElementsByTagName('*').length===0 && !tagName.includes("script")){
  } else if (attrValue == "" && innerText && !tagName.includes("script")) {
    var containsXpath = "//" + tagName + containsText + tempXpath;
    var totalMatch = _document.evaluate(
      containsXpath,
      _document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    ).snapshotLength;
    if (totalMatch === 0) {
      tempXpath = "//" + tagName + equalsText + tempXpath;
      var totalMatch = _document.evaluate(
        tempXpath,
        _document,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      ).snapshotLength;
      if (totalMatch === 1) {
        return tempXpath;
      }
    } else if (totalMatch === 1) {
      return containsXpath;
    } else {
      containsXpath =
        "//" +
        tagName +
        "[contains(text(),'" +
        innerText.slice(0, 50) +
        "')]" +
        tempXpath;
      totalMatch = _document.evaluate(
        containsXpath,
        _document,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      ).snapshotLength;
      if (totalMatch === 1) {
        return containsXpath;
      }
      tempXpath = containsXpath;
    }
  } else {
    tempXpath = "//" + tagName + tempXpath;
  }
  return tempXpath;
}

function createXPathWithIndex(element, chooseAttrs) {
  var xpathWithIndex = "";
  var totalMatch = 0;
  if (elementInShadowDom) {
    xpathWithIndex =
      "This element is inside Shadow DOM & for such elements XPath won't support.";
    xpathWithIndex = shadowDOMOpenOrClosed.includes("closed")
      ? "This element is inside closed Shadow DOM which is inaccessible so for such elements we can't verify/write selectors."
      : absXpath;
  } else {
    var xpath = buildXPathForElement(_document, element, chooseAttrsForXpath);
    var currentInspectedElement = _document
      .evaluate(
        absXpathForInspected,
        _document,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      )
      .snapshotItem(0);
    var elements = _document.evaluate(
      xpath,
      _document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );
    totalMatchFound = elements.snapshotLength;
    var index = 0;
    for (var i = 0; i < totalMatchFound; i++) {
      node = elements.snapshotItem(i);
      if (node === currentInspectedElement) {
        index = i + 1;
      }
    }
    xpathWithIndex = "(" + xpath + ")[" + index + "]";
    totalMatch = _document.evaluate(
      xpathWithIndex,
      _document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    ).snapshotLength;
  }
  var result = [];
  result.push(xpathWithIndex);
  result.push(totalMatch);

  return result;
}

function outlineOnHover(message) {
  message = JSON.parse(message);

  if (_document) {
    if (message.xpath || message.xpath === "") {
      if (message.name.includes("highlight-element")) {
        if (!message.xpath[1]) {
          message.name = "xpath";
        } else if (
          message.xpath[1].charAt(0).includes("/") ||
          message.xpath[1].charAt(0).includes("(") ||
          message.xpath[1].substr(0, 2).includes("./")
        ) {
          message.name = "xpath";
        } else {
          message.name = "css";
        }
        // message.name = elementInShadowDom?'css':message.name;
        if (message.xpath[1]) {
          passResultsToDevtoolsScript(
            message.name,
            message.xpath[1],
            message.xpath[2],
            message.xpath[3]
          );
        }
      }
    }

    if (message.name === "xpath") {
      var ele = _document.querySelector('[xpath="' + message.index + '"]');
      if (ele) {
        var outlineOrBorder = ele.nodeName.toLowerCase().includes("svg")
          ? "border"
          : "outline";
        //ele.style.outline= "2px dotted orangered !important";
        ele.style.cssText = outlineOrBorder + ":2px solid orangered !important";
        if (isFirefox) {
          if(!message.isSidePanel) ele.scrollIntoView({
            behavior: "smooth",
            block: "end",
            inline: "nearest",
          });
        } else {
          if(!message.isSidePanel) ele.scrollIntoViewIfNeeded();
        }
      }
    }

    if (message.name === "xpath-remove") {
      var ele = _document.querySelector('[xpath="' + message.index + '"]');
      if (ele) {
        if (ele.nodeName.toLowerCase().includes("svg")) {
          ele.style.border = "";
        } else {
          ele.style.outline = "";
        }
      }
    }

    if (message.name === "css") {
      var ele = "";
      if (elementInShadowDom) {
        try {
          ele = inspectedElement
            .getRootNode()
            .host.shadowRoot.querySelector('[css="' + message.index + '"]');
        } catch (err) {}
      } else {
        ele = _document.querySelector('[css="' + message.index + '"]');
      }
      if (ele) {
        var outlineOrBorder = ele.nodeName.toLowerCase().includes("svg")
          ? "border"
          : "outline";
        // ele.style.outline= "2px dotted orangered !important";
        ele.style.cssText = outlineOrBorder + ":2px solid orangered !important";
        if (isFirefox) {
          if(!message.isSidePanel) ele.scrollIntoView({
            behavior: "smooth",
            block: "end",
            inline: "nearest",
          });
        } else {
          if(!message.isSidePanel) ele.scrollIntoViewIfNeeded();
        }
      }
    }
    if (message.name === "css-remove") {
      var ele = "";
      if (elementInShadowDom) {
        ele = inspectedElement
          .getRootNode()
          .host.shadowRoot.querySelector('[css="' + message.index + '"]');
      } else {
        ele = _document.querySelector('[css="' + message.index + '"]');
      }
      //var ele = _document.querySelector('[css="' + message.index + '"]');
      if (ele) {
        if (ele.nodeName.toLowerCase().includes("svg")) {
          ele.style.border = "";
        } else {
          ele.style.outline = "";
        }
      }
    }
    message.xpath = "";
  }
}

function verifyXpathSelectors(name, xpathOrCss, val, onChange, chooseAttrs, baseUri) {
  
  onChange = onChange === true || onChange === "true";
  var xpath = [xpathOrCss, val, onChange, "" + chooseAttrs];
  let message = { name: name, xpath: xpath };

  _document = _document ? _document : document;

  if (_document) {
    if (message.xpath || message.xpath === "") {
      if (message.name.includes("highlight-element")) {
        if (!message.xpath[1]) {
          message.name = "xpath";
        } else if (
          message.xpath[1].charAt(0).includes("/") ||
          message.xpath[1].charAt(0).includes("(") ||
          message.xpath[1].substr(0, 2).includes("./")
        ) {
          message.name = "xpath";
        } else {
          message.name = "css";
        }
        // message.name = elementInShadowDom?'css':message.name;
        
        if (message.xpath[1]) {
          return passResultsToDevtoolsScript(
            message.name,
            message.xpath[1],
            message.xpath[2],
            message.xpath[3],
            baseUri
          );
        }
      }
    }
  }
}

// var topPlaywright = playwright;
var passResultsToDevtoolsScript = function(xpathOrCss, xpath, onChange, chooseAttrs, baseUri) {
    
    var tagName = "";
    var errorDetail = "";
    var indexBasedXpath = "";
    var iframeXpath = "";
    var iframeSelector = "";
    var suggestedSelector = "";

    // if(document.baseURI !== baseUri) return null;
    try {
        tagName = element.nodeName.toLowerCase();
    } catch (err) {}

    if (xpath.includes("//text()")) {
        xpath = xpath.replace("//text()", "//*[text()") + "]";
    }
    _document = _document ? _document : document;

    // if (_document != document) {
    //     playwright = _document.defaultView.playwright;
    // } else {
    //     playwright = topPlaywright;
    // }
    
    var elements;
    xpathOrCss = xpath === "." ? "xpath" : xpathOrCss;
    var inspectedElement1 = "";
    try {
        if ((xpathOrCss.includes("xpath") || xpath === ".") && !elementInShadowDom) {
            if (absXpathForInspected) {
              inspectedElement1 = _document.evaluate(absXpathForInspected, _document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null).snapshotItem(0);

                // if((isSVGChild(inspectedElement1) || inspectedElement1.nodeName.toLowerCase()=='svg') && !xpath.includes("/*")){
                if ((isSVGChild(inspectedElement1) || inspectedElement1.nodeName.toLowerCase() == "svg") && xpath.includes("/svg")) {
                    //chrome.runtime.sendMessage({ count: "wrong"+xpathOrCss+"errorInfo"+"Invalid svg xpath format."});
                    errorDetail = "wrong" + xpathOrCss + "errorInfo" + "Invalid svg xpath format.";
                    for (var i = 0; i < oldNodes.length; i++) {
                        deleteAttribute(oldNodes[i], xpathOrCss, onChange);
                    }
                    oldNodes = [];
                    allNodes = [];
                    var allInfo = {
                        errorDetail: errorDetail,
                        allNodes: allNodes,
                        indexBasedXpath: indexBasedXpath,
                        iframeSelector: iframeSelector,
                        suggestedSelector: suggestedSelector,
                    };
                    return allInfo;
                    //return;
                }
            }
            elements = _document.evaluate(xpath, _document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null); //xpath
        } else {
            //handle playwright locator without page.locator
            var xpathForPw = xpath;
            try{
              if(xpath.trim().slice(0, 5).toLowerCase()!="page." && xpath.charAt(0)!="/"){
                elements = _document.querySelectorAll(xpath);
                //handle shadow dom elements verification
                if(elements.length==0){
                  xpathForPw = xpath.replaceAll('"',"'");
                  xpathForPw = 'page.locator("'+xpathForPw+'")';
                }
              }
            }catch(err){
              //console.log(err);
              xpathForPw = xpath.replaceAll('"',"'");
              xpathForPw = 'page.locator("'+xpathForPw+'")';
            }
            
            if(xpathForPw.trim().slice(0, 5).toLowerCase() =="page." && xpath.charAt(0)!="/"){
              try{
                elements = getSelectorMatches(xpathForPw);
                if(elements.includes("Invalid Playwright Locator")){
                  elements = "wrong"+"PW Locator errorInfo"+elements.split("Invalid Playwright Locator")[1];
                  allNodes = [];
                  var allInfo = {
                      errorDetail: elements,
                      allNodes: allNodes,
                      indexBasedXpath: indexBasedXpath,
                      iframeSelector: iframeSelector,
                      suggestedSelector: suggestedSelector,
                  };
                  return allInfo;
                }
              }catch (err) {
                console.log(err);
              }
            }else{
              elements = _document.querySelectorAll(xpath);
            }
            //elements = playwright.$$(xpath);
            //if (!elements && elementInShadowDom) {
            
            //don't go inside below loop when user verify selector, added this for playwright support
            if (!onChange && elementInShadowDom) {
                elements = inspectedElement.getRootNode().host.shadowRoot.querySelectorAll(xpath);
            }

            //xpathOrCss="css";
            // if(elementInShadowDom){
            //     elements = inspectedElement.getRootNode().host.shadowRoot.querySelectorAll(xpath);
            // }else{
            //     elements = _document.querySelectorAll(xpath); //css
            // }
        }
    } catch (err) {
        if (xpath) {
            let errObject = errorInSelector(xpathOrCss, xpath);
            errorDetail = errObject.index ? errObject.message : errObject;
            xpathOrCss = xpathOrCss == "css" ? "cssSelector" : xpathOrCss;
            if (elementInShadowDom && (xpathOrCss.includes("xpath") || xpath === ".")) {
                xpathOrCss = "cssSelector";
                errorDetail = "xpath doesn't support ShadowDOM.";
            }
            //chrome.runtime.sendMessage({ count: "wrong"+xpathOrCss+"errorInfo"+errorMsg});
            errorDetail = "wrong" + xpathOrCss + "errorInfo" + errorDetail;
        } else {
            //chrome.runtime.sendMessage({ count: "blank" });
            errorDetail = "blank";
        }
        for (var i = 0; i < oldNodes.length; i++) {
            deleteAttribute(oldNodes[i], xpathOrCss, onChange);
        }
        oldNodes = [];
        allNodes = [];
        //return;
        var allInfo = {
            errorDetail: errorDetail,
            allNodes: allNodes,
            indexBasedXpath: indexBasedXpath,
            iframeSelector: iframeSelector,
            suggestedSelector: suggestedSelector,
        };
        return allInfo;
    }

    var totalMatchFound, node;
    if (xpathOrCss.includes("xpath")) {
        totalMatchFound = elements.snapshotLength; //xpath
    } else {
        totalMatchFound = elements.length; //css
    }
    for (var i = 0; i < oldNodes.length; i++) {
        deleteAttribute(oldNodes[i], xpathOrCss, onChange);
    }
    oldNodes = [];
    allNodes = [];

    // if(onChange){
    //     console.log("sending totalMatch-"+totalMatchFound);
    //     chrome.runtime.sendMessage({ count: totalMatchFound });
    // }

    for (var i = 0; i < totalMatchFound; i++) {
        if (xpathOrCss.includes("xpath")) {
            node = elements.snapshotItem(i); //xpath
        } else {
            node = elements[i]; //css
        }
        if (i === 0 && !(xpath === "/" || xpath === "." || xpath === "/." || xpath === "//." || xpath === "//..") && node.nodeType == 1) {
            if (isFirefox) {
                node.scrollIntoView({behavior: "smooth",
                    block: "center",
                    inline: "nearest",
                });
            } else {
                node.scrollIntoViewIfNeeded();
            }
        }
        oldNodes.push(node);
        oldAttribute = xpathOrCss;

        if (node.nodeType == 1) {
            appendAttribute(node, xpathOrCss, i + 1);
            allNodes.push(node.outerHTML);
        } else if (
            (node.nodeType == 2 || node.nodeType == 3) &&
            node.textContent.trim().length > 0
        ) {
            allNodes.push(node.textContent.trim());
        } else {
            if (node.value == undefined) {
                allNodes.push(" ");
            } else {
                allNodes.push(node.name + '="' + node.value + '"');
            }
        }
    }
    //chrome.runtime.sendMessage({ count: allNodes });

    if (xpathOrCss.includes("xpath") && totalMatchFound > 1) {
        var inspectedElement1 = _document.evaluate(absXpathForInspected, _document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null).snapshotItem(0);
        var xpathIndex = inspectedElement1.getAttribute("xpath");
        if (xpathIndex) {
            //chrome.runtime.sendMessage({ count: "1-sanjayMatchingNode--sanjayXpathIndex-("+xpath+")["+xpathIndex+"]"});
            indexBasedXpath = "1-sanjayMatchingNode--sanjayXpathIndex-(" + xpath + ")[" + xpathIndex + "]";
        }
    }
    if (_document !== document) {
        if (hubMode !== "onlyEditor") {
            var tempDoc = _document;
            try {
                if (baseUri) {
                    documentIframes = [];
                    allDocumentIframes(document);
                    for (let i = 0; i < documentIframes.length; i++) {
                        let iframe = documentIframes[i];
                        if (iframe.attributes.length > 0) {
                            for (let j = 0; j < iframe.attributes.length; j++) {
                                let att = iframe.attributes[j];
                                if (att.value === baseUri) {
                                    if (!iframe.contentDocument) {
                                        iframeXpath = createRelXpath(
                                            iframe,
                                            ",withid,withclass,withname,withplaceholder,withtext"
                                        );
                                        iframeSelector = ["frame", iframeXpath, [], true];
                                        break;
                                    }
                                }
                            }
                        }
                    }
                    // iframeSelector = ["frame", iframeXpath, parentiframeXpath];
                }
                iframeXpath = getIframeXpath(_document);
            } catch (err) {
                console.log(err);
            }
            // var iframeXpath = getIframeSelector(_document);
            // var iframeSelector = [frameOriframe, iframeXpath, parentiframeXpath];
            iframeSelector = ["frame", iframeXpath, parentiframeXpath];
            parentiframeXpath = [];
            //chrome.runtime.sendMessage({ count: iframeSelector });
            _document = tempDoc;
        }
        try {
            var allAddedStyle = _document.querySelectorAll("style[selectorshub]");
            for (var i = 0; i < allAddedStyle.length; i++) {
                allAddedStyle[i].remove();
            }
        } catch (err) {}

        var styles = "[xpath], [css]{outline: 2px dashed #00bcd4 !important}";
        var styleElement = _document.createElement("style");
        styleElement.setAttribute("SelectorsHub", "sh");
        styleElement.textContent = styles;
        _document.documentElement.appendChild(styleElement);

        styles = '[xpath="1"], [css="1"]{outline:2px dashed #f29a00 !important}';
        styleElement = _document.createElement("style");
        styleElement.setAttribute("SelectorsHub", "sh");
        styleElement.textContent = styles;
        _document.documentElement.appendChild(styleElement);
    } else {
        if (elementInShadowDom) {
            try {
                var allAddedStyle = inspectedElement.getRootNode().host.shadowRoot.querySelectorAll("style[selectorshub]");
                for (var i = 0; i < allAddedStyle.length; i++) {
                    allAddedStyle[i].remove();
                }
            } catch (err) {}

            var styles = "[xpath], [css]{outline: 2px dashed #0715f7f7 !important}";
            var styleElement = _document.createElement("style");
            styleElement.setAttribute("SelectorsHub", "sh");
            styleElement.textContent = styles;
            inspectedElement.getRootNode().host.shadowRoot.appendChild(styleElement);

            styles = '[xpath="1"], [css="1"]{outline:2px dashed #ffa500 !important}';
            styleElement = _document.createElement("style");
            styleElement.setAttribute("SelectorsHub", "sh");
            styleElement.textContent = styles;
            inspectedElement.getRootNode().host.shadowRoot.appendChild(styleElement);
        }
        //chrome.runtime.sendMessage({ count: "shadowdom" });
        // }else if(tagName.includes('svg') || isSVGChild(element)) {
        //     chrome.runtime.sendMessage({ count: "svgelement" });
        // }else{
        //     chrome.runtime.sendMessage({ count: "notIframe" });
        // }
    }

    var url = "websiteUrl-" + document.URL;

    //chrome.runtime.sendMessage({ count: url });

    //pageUrl = url;

    if (onChange && !elementInShadowDom) {
        var tempEle = _document.querySelector("[" + xpathOrCss + '="1"]');
        var suggested = ["", 0];

        try {
            suggestedFlag = true;
            createAbsXpath(tempEle);
            suggested = createCssSelector(tempEle, chooseAttrs);
        } catch (err) {}

        suggestedFlag = false;

        if (suggested[1] !== 1) {
            suggested = createRelXpath(tempEle, chooseAttrs);
        }
        suggestedSelector = ["suggestedSelector", suggested];
        /*
            if(suggested[1]!=0){
                //chrome.runtime.sendMessage({ count: suggestedSelector });
            }
            */
    }

    var allInfo = {
        errorDetail: errorDetail,
        allNodes: allNodes,
        indexBasedXpath: indexBasedXpath,
        iframeSelector: iframeSelector,
        suggestedSelector: suggestedSelector,
        url: url,
    };
    //allInfo = JSON.stringify(allInfo);

    return allInfo;
};

 function turnOnDebugger(debuggerTime){
    let firstRunTime;
    debuggerTime = parseInt(debuggerTime)
    setTimeout(()=>{
        firstRunTime = Date.now();
        debugger;
    }, debuggerTime);

    setTimeout(()=>{
            const secondRunTime = Date.now();
            const diff = secondRunTime - firstRunTime;
            if (!(Math.abs(diff - 500) > 500 && Math.abs(diff - 500) > 600)) {
               chrome.runtime.sendMessage({ showWarning:'showWarning' });
            }
    }, debuggerTime+500);
 }

function elementTypeAndInfo(element) {
  // if (!isFirefox) {
  //   _document = element.ownerDocument;
  //   inspectedElement = element;
  //   elementInShadowDom = isInShadow(element);
  //   iframeOfFrame(element);
  // }

  _document = element.ownerDocument;
  inspectedElement = element;
  elementInShadowDom = isInShadow(element);
  iframeOfFrame(element);

  var tagName = element.nodeName.toLowerCase();

  var elementType = "";
  if (_document !== document) {
    //chrome.runtime.sendMessage({ count: frameOriframe });
    elementType = frameOriframe;
  } else if (tagName.includes("svg") || isSVGChild(element)) {
    //chrome.runtime.sendMessage({ count: "svgelement" });
    elementType = "svgelement";
  } else {
    if (elementInShadowDom) {
      //chrome.runtime.sendMessage({ count: "shadowdom" });
      elementType = "shadowdom";
    } else {
      //chrome.runtime.sendMessage({ count: "notIframe" });
      elementType = "notIframe";
    }
  }

  var elementInfo = "";
  if (
    element.offsetWidth < 2 ||
    element.offsetHeight < 2 ||
    element.style.visibility === "hidden" ||
    element.style.visibility === "none" ||
    element.tagName.toLowerCase() === "script" ||
    element.tagName.toLowerCase() === "style"
  ) {
    // var elementInfo = "it is not visible in UI.";
    elementInfo =
      'Alert: This element is not interactable through selenium(automation) as it is not visible in UI. Try any near by element.<a class="training" href="https://bit.ly/sh_courses_recordings" target="_blank"> Learn more...</a>';
    elementInfo = "elementInfo-" + elementInfo;
    //chrome.runtime.sendMessage({ count: "elementInfo-"+elementInfo});
  }

  if (element.tagName.toLowerCase() === "input" && element.disabled) {
    elementInfo = "Alert: Input box is disabled, enable it to enter value.";
    elementInfo = "elementInfo-" + elementInfo;
    //chrome.runtime.sendMessage({ count: "elementInfo-"+elementInfo});
  }

  let elementTypeAndInfo = {
    elementType: elementType,
    elementInfo: elementInfo,
  };

  return elementTypeAndInfo;
}

function checkInvalidSelector(selectorValue){
  try{
      playwright.$(selectorValue);
  }catch(err){
     try{
         document.evaluate(selectorValue, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
     }catch(err){
         return err;
     }
  }
}
