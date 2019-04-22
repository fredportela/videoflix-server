$(function() {

    jQuery.ajaxSetup({
        xhr: function () {
            var xhr = new window.XMLHttpRequest();
            //Download progress
            xhr.addEventListener("progress", function (evt) {
                if (evt.lengthComputable) {
                    var percentComplete = evt.loaded / evt.total;
                    console.log(percentComplete);
                    $('.progress .progress-bar')
                        .css('width', Math.round(percentComplete * 100) + "%")
                        .html(Math.round(percentComplete * 100) + "%");
                }
            }, false);
            return xhr;
        },
        beforeSend: function() {
            $('.progress').show();
        },
        complete: function(){
            $('.progress').hide();
        },
        success: function() {}
    });

    $("form#files").submit(function(){
        var formData = new FormData($(this)[0]);
    
        $.ajax({
            url: window.location.href + 'upload',
            type: 'POST',
            data: formData,
            async: true,
            cache: false,
            xhr: function () {
                var xhr = new window.XMLHttpRequest();
                //Download progress
                xhr.addEventListener("progress", function (evt) {
                    console.log(evt);
                    if (evt.lengthComputable) {
                        var percentComplete = evt.loaded / evt.total;
                        console.log(percentComplete);
                        $('.progress .progress-bar')
                            .css('width', Math.round(percentComplete * 100) + "%")
                            .html(Math.round(percentComplete * 100) + "%");
                    }
                }, false);
                return xhr;
            },
            success: function (data) {
                setVideoPlayer(data);
            }
        });
    
        return false;
    });
   
});

function setVideoPlayer(data) {
    if (window.playerElement) {
        window.playerElement.dispose();
    }
    videojs('my-video').ready(function () {
        var myPlayer = this;
        myPlayer.src({src: window.location.href + data.url, type: data.mimetype });
    });
}