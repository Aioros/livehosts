function elt(root, id) { return root.getElementById(id); }

function restore() {
    elt(document, 'munge').checked = (localStorage['mungeLinks'] == 'true');

    var nurls = 0;
    for (var k in localStorage) {
        if (k.match(/^http:/)) {
            nurls++;
            var tr = document.createElement('tr');
            var info = JSON.parse(localStorage[k]);
            tr.innerHTML = '<td>' + k + '</td>' +
                '<td><a href="' + info.longUrl + '">' +
                (info.title ? info.title : info.longUrl.split('/').pop()) +
                '</a></td>';
            elt(document, 'urldetail').appendChild(tr);
        }
    }
    elt(document, 'nurls').innerHTML = nurls;

    if (localStorage['services']) {
        var services = JSON.parse(localStorage['services']);
        var nsvcs = 0, svctext = '';
        for (var k in services) {
            nsvcs++;
            svctext += services[k].domain + ' ';
        }
        elt(document, 'nsvcs').innerHTML = nsvcs;
        elt(document, 'svcs').innerHTML = svctext;
    }

    var exp = localStorage['servicesExpire'];
    elt(document, 'svcstatus').innerHTML = exp ? 'until ' +
        new Date(+exp) : 'will be reloaded on use';

    if (localStorage['extraServices'])
        elt(document, 'extras').innerHTML = localStorage['extraServices'];
}

function save() {
    localStorage['mungeLinks'] = elt(document, 'munge').checked;
    localStorage['extraServices'] = elt(document, 'extras').value;
}

function clearUrls() {
    for (var k in localStorage) {
        if (k.match(/^http:/))
            localStorage.removeItem(k);
    }
}

function clearServices() {
    localStorage.removeItem('services');
    localStorage.removeItem('servicesExpire');
}
