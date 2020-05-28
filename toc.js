window.onload = function() {
    const toc = document.querySelector('#toc');
    const content = document.querySelector('.post');

    var sections = [];
    var currSection = -1;

    window.onresize = function() {
        sections = [];
        Array.prototype.forEach.call(content.querySelectorAll("h2,h3"), function(e) {
            sections.push({ "offsetTop": e.offsetTop, id: e.id });
        });
    };
    window.onresize();

    function setActiveSection(i) {
        currSection = i;
        const active = toc.querySelector('.active');
        if (active != null)
            active.removeAttribute('class');
        if (currSection >= 0)
            toc.querySelector('a[href="#' + sections[currSection].id + '"]').setAttribute('class', 'active');
    }

    window.onscroll = function() {
        const scrollPosition = document.documentElement.scrollTop || document.body.scrollTop;

        for(let i = 0; i < sections.length; ++i)
        {
            if (scrollPosition < sections[i].offsetTop - 1)
            {
                if (currSection != i - 1)
                    setActiveSection(i - 1);
                return;
            }
        }
        setActiveSection(sections.length - 1);
    };

    window.onscroll();
};