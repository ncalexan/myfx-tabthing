
/* this file is loaded by the control panel, in a resource: URL, so it runs
 in the usual web-content context. */

var sendToBackend;

function msgFromBackend(name, data) {
    console.log("msgFromBackend", name, data);
    if (name == "tabs") {
        var ul = $("div#tabs > ul");
        ul.empty();
        var devices = Object.keys(data);
        devices.sort();
        devices.forEach(function(deviceName) {
            var tabs = data[deviceName];
            var dul = $("#templates>.device-entry").clone();
            dul.find("span.device-name").text(deviceName);
            ul.append(dul);
            var tul = dul.find("ul.device-tabs");
            tabs.forEach(function(tab) {
                var title = tab.title || "(no title)";
                var t = $("#templates>.tab-entry").clone();
                t.find("a").attr("href", tab.url);
                t.find("a").text(title);
                tul.append(t);
            });
        });
    }
    if (name == "auth-success") {
        $("#sign-in").hide();
        $("#user").text(data.user.email); // also .id, .hash, .provider
        $("#my-device-name").val(data.device);
        $("#logged-in").show();
    }
    console.log("done");
}


$(function() {
    console.log("page loaded");
    // we are running in a FF addon
    sendToBackend = function(name, data) {
        /* the addon injects code to catch our "from-content" messages
         and relay them to the backend. It also fires "to-content"
         events on the window when the backend wants to tell us
         something. */
        console.log(["to-backend(JP)", name, data||{}]);
        var e = new CustomEvent("from-content",
                                {detail: {name: name, data: data||{} }});
        window.dispatchEvent(e);
    };
    function backendListener(e) {
        var msg = JSON.parse(e.detail);
        try {
            msgFromBackend(msg.name, msg.data);
        } catch (e) {
            // apparently exceptions raised during event listener
            // functions aren't printed to the error console
            console.log("exception in msgFromBackend");
            console.log(e);
        }
    }
    window.addEventListener("to-content", backendListener);
    window.setTimeout(mainSetup, 0);
});

function showError(text) {
    $("#error").show().text(text);
}


function doFBPersonaAuth() {
    console.log("about to authClient");
    var db = new Firebase("https://warner.firebaseio.com/tabthing");
    console.log("created DB reference");
    var authClient = new FirebaseAuthClient(db);
    console.log("created authClient");
    authClient.login("persona", function(error, token, user) {
        console.log("authClient.login done", error, token, user);
        if (error) showError(error);
        else
            sendToBackend("fb-login", {token: token,
                                       user: user,
                                       device: $("#my-device-name").val()
                                      });
    });
}

function doP() {
    function callback(error, token, user) {
        console.log("authClient.login done", error, token, user);
        if (error) showError(error);
        else
            sendToBackend("fb-login", {token: token,
                                       user: user,
                                       device: $("#my-device-name").val()
                                      });
    }
    function onlogin(assertion) {
        console.log("onlogin", assertion);
        var db = new Firebase("https://warner.firebaseio.com/tabthing");
        console.log("created DB reference");
        try {
            var authClient = new FirebaseAuthClient(db);
            authClient.jsonp("/auth/persona/authenticate",
                             {"assertion":assertion},
                             function(error, response) {
                                 if(error || !response["token"]) {
                                     callback(error);
                                 }else {
                                     var token = response["token"];
                                     var user = response["user"];
                                     authClient.attemptAuth(token, user, callback);
                                 }
                             });
        } catch(e) {
            console.log("error", e);
        }
    }

    navigator.id.watch({"onlogin": onlogin,
                        "onlogout": function(){}
                       });
    navigator.id.request();
}

function mainSetup() {
    console.log("mainSetup");
    $("#error").hide();
    $("#sign-in").show();
    $("#logged-in").hide();
    //$("#sign-in").on("click", doFBPersonaAuth);
    $("#sign-in").on("click", doP);
};
