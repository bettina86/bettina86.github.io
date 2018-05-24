/*
By Pellegrino ~thp~ Principe V 1.0
*/
var thpPLAYER =
{
    video_element: null,
    go_fallback: false,
    media_types:
        {
            webm: 'video/webm; codecs="vp8, vorbis"',
            ogg: 'video/ogg; codecs="theora, vorbis"',
            mp4: 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"'
        },

    video_duration: 0,
    loader: false,
    tracks: {},

    video_path: "php/uploaded/",

    // per il message dialog
    callback_OK: function () { },
    callback_CANCEL: function () { },

    videos: [],

    init: function ()
    {
        thpPLAYER.initUI(); // inizializziamo i componenti grafici con jQuery UI

        thpPLAYER.video_element = $("#video_container")[0];

        // verifichiamo se il browser corrente può riprodurre i video
        if (!!thpPLAYER.video_element.canPlayType &&
            thpPLAYER.video_element.canPlayType(thpPLAYER.media_types["webm"]) == "" &&
            thpPLAYER.video_element.canPlayType(thpPLAYER.media_types["ogg"]) == "" &&
            thpPLAYER.video_element.canPlayType(thpPLAYER.media_types["mp4"]) == "")
            thpPLAYER.fallback(thpPLAYER.video_element);
        else // imposto gli eventi per il video
        {
            thpPLAYER.videoEvents(thpPLAYER.video_element);
            thpPLAYER.controlsEvents(thpPLAYER.video_element);

            // eventi per la playlist
            $("#playlist").on("click", thpPLAYER.manageVideos);
        }
    },

    initUI: function ()
    {
        $("#bu").button().click(function () // attiva l'input di tipo file
        {
            $("#uf").click();
        });

        // dopo che abbiamo selezionato il file facciamone l'upload
        $("#uf").on("change", function (e)
        {
            var file = e.target.files[0]; // file-system API

            var info = $("#PB span");
            $("#track_upload").dialog("option", "title", "Upload " + file.name);

            // AJAX uploader
            var xhr = new XMLHttpRequest();
            if (xhr.upload) // Level 2?
            {
                $(xhr.upload).on("progress", function (e)
                {
                    var oe = e.originalEvent;
                    console.log(oe)
                    if (oe.lengthComputable) // il contenuto è calcolabile?
                    {
                        var perc = oe.loaded / oe.total * 100;
                        var b = Math.round(perc);
                        $("#PB").progressbar("option", "value", b);

                        info.text("[" + oe.loaded + "/" + oe.total + "] bytes uploaded :: " + b + "%");
                    }
                });

                $(xhr.upload).on("loadend", function (e)
                {
                    var oe = e.originalEvent;
                    var perc = 100;

                    // c'è ancora da computare? qualche bytes appeso? 
                    if (oe.lengthComputable)
                    {
                        perc = oe.loaded / oe.total * 100;
                        var b = Math.round(perc);
                        $("#PB").progressbar("option", "value", b);

                        info.text("[" + oe.loaded + "/" + oe.total + "] bytes uploaded :: " + b + "%");
                    }

                    if (perc >= 100)
                    {
                        $("#status").css("background-image", "url(img/ok.png)").css("display", "block");

                    }
                    else
                        $("#status").css("background-image", "url(img/err.png)").css("display", "block");

                    // se ci sono già 8 video allora avvisa che si è raggiunto il nr. massimo della playlist
                    // e l'ultimo inserito sarà sempre sovrascritto
                    if (thpPLAYER.videos.length == 8)
                    {
                        thpPLAYER.callback_OK = function ()
                        {
                            thpPLAYER.videos[thpPLAYER.videos.length - 1] = thpPLAYER.video_path + file.name;
                            // visualizza nella lista il nome del corrente elemento caricato
                            $("#playlist").children().eq([thpPLAYER.videos.length - 1]).text(file.name);
                        }

                        $("#message").html("<p>Si possono inserire al massimo 8 video. Se procedi i video saranno sovrascritti.</p>");
                        $("#message").dialog("open");
                    }
                    else
                    {
                        // bisogna ripetere il codice perché jQuery UI dialog è asincrono e non bloccante come un confirm!
                        thpPLAYER.videos.push(thpPLAYER.video_path + file.name);
                        // visualizza nella lista il nome del corrente elemento caricato
                        $("#playlist").children().eq([thpPLAYER.videos.length - 1]).text(file.name);

                        $("#label").find("span").text([thpPLAYER.videos.length]);
                    }

                    // verifichiamo se nella cartella di upload esistono dei file .vtt con lo stesso nome del file video caricato
                    // e in caso positivo memorizziamo un oggetto JSON contenente informazioni per la creazione degli appositi
                    // elementi track
                    $.get("php/tracks.php",
                           { name: file.name },
                           function (data, status, xhr)
                           {
                               thpPLAYER.tracks = data;
                           },
                           "json"
                        );
                });

                xhr.open("POST", $("#form_1").attr("action"), true);
                xhr.setRequestHeader("X_FILENAME", file.name);
                xhr.send(file);
            }
        });


        $("#track_upload").dialog(
        {
            autoOpen: false, // rimane chiuso dopo la sua inizializzazione
            title: "Upload...",
            modal: true,
            height: 250,
            width: 500,
            modal: true,
            resizable: false,
            position: [450, 40]
        });


        $("#message").dialog(
        {
            autoOpen: false, // rimane chiuso dopo la sua inizializzazione
            title: "Message",
            modal: true,
            height: 250,
            width: 500,
            modal: true,
            resizable: false,
            buttons:
            [
                {
                    text: "Procedi",
                    click: function ()
                    {
                        thpPLAYER.callback_OK();
                        $(this).dialog("close");
                    }
                },
                {
                    text: "Annulla",
                    click: function ()
                    {
                        thpPLAYER.callback_CANCEL();
                        $(this).dialog("close");
                    }
                }
            ]
        });

        $("#volume_slider").slider(
        {
            animate: "slow",
            orientation: "vertical",
            step: 1,
            min: 0,
            max: 10,
            value: 10,
            change: function ()
            {
                // i valori vanno da 0.0 a 1.0
                var volume = $("#volume_slider").slider("value") * 0.1;
                thpPLAYER.video_element.volume = volume;
            }
        }).hide().position(
                            {
                                //   HOR   VERT  //
                                my: "center bottom",
                                at: "center top",

                                // target
                                of: "#volume"
                            });

        $("#PB").progressbar();

        $("#subtitles").position(
                            {
                                //   HOR   VERT  //
                                my: "center bottom",
                                at: "center top",

                                // target
                                of: "#caption"
                            });
    },

    videoEvents: function (ve)
    {
        // durata del video
        $(ve).on("loadedmetadata", function ()
        {
            thpPLAYER.formatDuration(ve.duration);
        });

        // download della risorsa
        $(ve).on("progress", function ()
        {
            if (ve.networkState === ve.NETWORK_LOADING)
            {
                if (thpPLAYER.loader == false) // il loader non è ancora visualizzato?
                    thpPLAYER.showLoader("block");
            }
            else if (ve.networkState === ve.NETWORK_IDLE)
                thpPLAYER.showLoader("none");
        });

        // posso riprodurre il video
        $(ve).on("loadeddata", function ()
        {
            ve.currentTime = 0.0;
        });

        // tutti i dati arrivati...
        $(ve).on("canplaythrough", function ()
        {
            thpPLAYER.showLoader("none");
        });

        // ERRORE
        $(ve).on("error", function ()
        {
            thpPLAYER.showLoader("none");
        });

        // STALLO
        $(ve).on("stalled", function ()
        {
            thpPLAYER.showLoader("none");
        });

        // update tempo di riproduzione
        $(ve).on("timeupdate", function ()
        {
            thpPLAYER.formatDuration();
        });
    },

    controlsEvents: function (ve)
    {
        // rileva se lo slider del volume è aperto e poi lo chiude se click nell'area del documentElement
        $(document.documentElement).on("click", function (e)
        {
            if ($("#volume_slider").css("display") == "block" && e.target.id != "volume")
            {
                $("#volume_slider").toggle("slide", { direction: "down" });
            }

            if ($("#subtitles").css("display") == "block" && e.target.id != "caption")
            {
                $("#subtitles").toggle("slide", { direction: "down" });
            }
        });

        $("#controls").on("click",
            function (ev)
            {
                if (ev.target.tagName == "DIV")
                {
                    switch (ev.target.id)
                    {
                        case "play":
                            ve.play();
                            break;
                        case "pause":
                            ve.pause();
                            break;
                        case "stop":
                            ve.currentTime = 0.0;
                            ve.pause();
                            break;
                        case "volume":
                            $("#volume_slider").toggle("slide", { direction: "down" });
                            break;
                        case "forw":
                            ve.currentTime += 0.5;
                            break;
                        case "rew":
                            ve.currentTime -= 0.5;
                            break;
                        case "start":
                            ve.currentTime = 0.0;
                            break;
                        case "end":
                            ve.currentTime = ve.duration;
                            break;
                        case "fullscreen":

                            // w3C Fullscreen API 
                            $("#video_container")[0].fullScreen = $("#video_container")[0].requestFullscreen || // W3C, Opera
                            $("#video_container")[0].mozRequestFullScreen || // Firefox
                            $("#video_container")[0].webkitRequestFullScreen; // Chrome
                            
                            $("#video_container")[0].fullScreen();
                            break;

                        case "playlist_sh":

                            // show / hide playlist
                            $("#playlist").toggle("slide");
                            $("#label").toggle("slide");
                            break;

                        case "caption":
                            $("#subtitles").toggle("slide", { direction: "down" });
                            break;

                        case "upload":
                            $("#track_upload").dialog("open"); // apre un dialog modale
                            
                    }
                }
            });
    },

    formatDuration: function (d)
    {
        // mettiamo lo 0 a min o sec se < 9
        function adjustData()
        {
            var w, z;
            if (arguments.length == 1)
            {
                w = arguments[0];
                w = w > 9 ? w : "0" + w;
                return {
                    sec: w
                };
            }
            else if (arguments.length == 2)
            {
                w = arguments[0];
                z = arguments[1];
                w = w > 9 ? w : "0" + w;
                z = z > 9 ? z : "0" + z;
                return {
                    min: z,
                    sec: w
                };
            }
        }

        var empty_data = "00:00:00 / ";
        var data = "";

        var dur = $("#metadata")[0];

        var d_calc = !d ? thpPLAYER.video_element.currentTime : d;

        d_calc = Math.round(d_calc); // arrotondiamo

        if (d_calc < 60) // secondi
        {
            d_obj = adjustData(d_calc);

            data = !d ? ("00:00:" + d_obj.sec + " / " + thpPLAYER.video_duration) :
            empty_data + "00:00:" + d_obj.sec;

            if (d)
                thpPLAYER.video_duration = "00:00:" + d_obj.sec;
        }
        else if (d_calc < 3600) // minuti
        {
            var sec = d_calc % 60;
            var min = Math.floor(d_calc / 60);

            d_obj = adjustData(sec, min);

            data = !d ? ("00:" + d_obj.min + ":" + d_obj.sec + " / " + thpPLAYER.video_duration) :
            empty_data + "00:" + d_obj.min + ":" + d_obj.sec;

            if (d)
                thpPLAYER.video_duration = "00:" + d_obj.min + ":" + d_obj.sec;
        }
        else // ore
        {
            var h = Math.floor(d_calc / 3600);

            var m_t = d_calc % 3600;
            var m = Math.floor(m_t / 60);
            var s = m_t % 60;

            d_obj = adjustData(s, m);

            data = !d ? (h + ":" + d_obj.min + ":" + d_obj.sec + " / " + thpPLAYER.video_duration) :
            empty_data + h + ":" + d_obj.min + ":" + d_obj.sec;

            if (d)
                thpPLAYER.video_duration = h + ":" + d_obj.min + ":" + d_obj.sec;
        }

        dur.innerHTML = data;
    },

    fallback: function (ve)
    {
        thpPLAYER.go_fallback = true;
        ve.poster = "img/poster_fallback.png";

        $("#hide").css("display", "display");
    },

    showLoader: function (d)
    {
        if (d == "block")
            thpPLAYER.loader = true;
        else
            thpPLAYER.loader = false;

        $("#loader").css("display", d);
    },

    manageVideos: function (ev)
    {
        // ritorna il corretto media type a seconda del tipo di file multimediale
        // solo: .ogg, .mp4, .webm
        function getMediaType(v)
        {
            return thpPLAYER.media_types[v.split(".")[1]];
        }

        // se il click è venuto da un elemento div dei video creiamo il relativo elemento source
        if (ev.target.tagName == "DIV" && ev.target.id.indexOf("video") != -1 && thpPLAYER.videos.length != 0)
        {
            var nr = parseInt(ev.target.id.split("-")[1]);

            // aggiungiamo dinamicamente un elemento source
            var src = $("<source>").attr(
                {
                    "type": getMediaType(thpPLAYER.videos[nr]),
                    "src": thpPLAYER.videos[nr]
                }).on("error", thpPLAYER.fallback);

            var $source = $(thpPLAYER.video_element).find("source").eq(0);
            if ($source.length == 1)
                $source.replaceWith(src);
            else
                $(thpPLAYER.video_element).append(src);
            
            // se ci sono già delle tracce non ricaricarle
            if ($("video").find("track").length == 0)
                thpPLAYER.createTracks();

            thpPLAYER.video_element.load(); // iniziamo il caricamento dei dati del video
        }
    },

    createTracks: function ()
    {
        for (var t in thpPLAYER.tracks)
        {
            if (thpPLAYER.tracks[t][0])
            {
                var t = $("<track>").attr(
                    {
                        "kind": "subtitles",
                        "label": "Subtitles in " + thpPLAYER.tracks[t][1],
                        "src": thpPLAYER.video_path + t,
                        "srclang": thpPLAYER.tracks[t][2]
                    }).appendTo("video");
            }

            $("track:first").attr("default", "true"); // rendi la prima traccia quella di default
        }

        $("track").each(function (index, elem)
        {
            var l = $(elem).attr("label").split(" ")[2];

            $("#subtitles").append("<input type = 'radio' name = 'sub' id = " + index + " />" + l + "<br />").
            on("click", function (ev) // attiva la corrispondente traccia
            {
                if ($("#subtitles input").eq(0).is(":checked"))
                {
                    $("video")[0].textTracks[0].mode = "showing";
                    $("video")[0].textTracks[1].mode = "hidden";
                }
                else if ($("#subtitles input").eq(1).is(":checked"))
                {
                    $("video")[0].textTracks[0].mode = "hidden";
                    $("video")[0].textTracks[1].mode = "showing";
                }
            });
        });
    }
};

