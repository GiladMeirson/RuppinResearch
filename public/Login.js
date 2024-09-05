const isLocal = window.location.hostname === 'localhost';
const prefix = isLocal? 'http://localhost:3000' : 'https://ruppin-llm-research.vercel.app/';
const loginUrl = `${prefix}/Login`;

$(document).ready(()=>{

    if (localStorage.getItem('user')) {
        window.location.href = '/sendQuestion.html';
    }


    $('#loginForm').submit((e)=>{
        e.preventDefault();
        $('#loading').show();
        const username = $('#username').val();
        const password = $('#password').val();
        const user = {username, password};
        $.ajax({
            url: loginUrl,
            method: 'POST',
            data: JSON.stringify(user),
            contentType: 'application/json',
            success: function(response) {
                $('#loading').hide();
                console.log('AJAX call successful:', response);
                if (response.result == 'failed') {
                    Swal.fire({
                        title: "Failed to login",
                        text: "the user is not authorized",
                        icon: "error"
                    });
                }
                else if (response.result == 'success') {
                    localStorage.setItem('user', JSON.stringify(response.user));
                    Swal.fire({
                        title: "Login Successful",
                        text: "Welcome to the system",
                        icon: "success"
                    });
                    setTimeout(() => {
                    window.location.href = '/sendQuestion.html';
                    }, 1200);
                }
            },
            error: function(error) {
                console.error('AJAX call failed:', error);
                $('#loading').hide();
                // Handle the error here
            }
        });

    })
})
