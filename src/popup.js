const parse = (csv) => {
    /*
    Rating	ID	Title	Title ZH	Title Slug	Contest Slug	Problem Index
    3018.4940165727	1719	Number Of Ways To Reconstruct A Tree	重构一棵树的方案数	number-of-ways-to-reconstruct-a-tree	biweekly-contest-43	Q4
    2872.0290327119	1982	Find Array Given Subset Sums	从子集的和还原数组	find-array-given-subset-sums	weekly-contest-255	Q4
    */
  
    let lines = csv.split("\n"); // split rows by newline
    let headers = lines.shift().split(/\t+/); // first row is headers, split cols by tab
    // sorted with rating 
    let data = [];
    for (let row of lines) {
        row = row.split(/\t+/); // data, split cols by tab
        if (row.length == headers.length) { // remove ''
            row[0] = parseFloat(row[0]);
            data.push(Object.fromEntries(headers.map((k, j) => [k, row[j]])));
        }
    }
    
    data.sort((x, y) => {
        return x.Rating - y.Rating;
    });
    return data;
    // dict version
    json = {};
    for (let i = 0; i < data.length; i++) {
        let item = data[i];
        item.next = (i + 1 < data.length ? data[i + 1]['Title Slug'] : '');
        // key
        json[item['Title Slug']] = item; 
    }
    return json;
  };

const getData = (async () => {
    //await chrome.storage.local.clear();
    let items = await chrome.storage.local.get();
    if(!items.hasOwnProperty("rate")) {
        await chrome.storage.local.set({'rate': 1800,});
    }
    const expire = 1000 * 60 * 60 * 24 * 7; // cache for 7 day
    if(!items.hasOwnProperty("cacheTime") || Date.now() > items.cacheTime + expire) {
        let data = parse(
            await fetch(
                "https://raw.githubusercontent.com/zerotrac/leetcode_problem_rating/main/ratings.txt"
                ).then((res) => res.text())
            );
        chrome.storage.local.set({'data': data, 'cacheTime': Date.now()});
    } 
    items = await chrome.storage.local.get();
    return items;
});



// ----- eventListener-------------
const eventTrigger = (data) => {
    jumpClick(data);
    nextClick(data);
    rangeChange();
};

const rangeChange = () => {
    let range = document.querySelector("#range-input");
    range.addEventListener("input", (e) => {
        document.getElementById("range-value").innerHTML = e.target.value;
        document.getElementById('Jump').value = e.target.value;
    });
};

const jumpClick = (data) => {
    let jump = document.getElementById("Jump");
    jump.addEventListener("click", (e) => {
        let target = document.getElementById('Jump').value;
        let problem = data[binarySearch(data, target)];
        tabCreate(problem);
    });
};

const nextClick = (data) => {
    let next = document.getElementById("Next");
    next.addEventListener("click", (e) => {
        let index = document.getElementById("Next").value;
        if (index !== '') {
            let problem = data[index];
            tabCreate(problem);
        }
    });
};

const tabCreate = (problem) => {
    setRate(problem['Rating']);
    chrome.tabs.create({
        'url': "https://leetcode.com/problems/" + problem['Title Slug'] + '/'
    });
};

const binarySearch = (data, target) => {
    let l = 0, r = data.length;
    while (l < r) {
        let mid = (l + r) >> 1;
        if (data[mid]['Rating'] < target) {
            l = mid + 1;
        } else {
            r = mid;
        }
    }
    return l;
};
// -----------------------------

const setRate = (rate) => {
    chrome.storage.local.set({'rate': rate});
};

const setRange = ((rate) => {
    document.getElementById("range-value").innerHTML = parseInt(rate) + (rate !== 1800 ? ' (Current)': ' (Default)');
    document.getElementById("range-input").value = parseInt(rate);
    document.getElementById('Jump').value = rate;
});

const setTitle = ((items) => {
    if (Object.keys(items).length > 0) {
        document.getElementById("Rating").innerHTML = parseInt(items['Rating'])
        document.getElementById("Problem Index").innerHTML = '&nbsp;&nbsp;' + items['Problem Index'];
        document.getElementById("Contest Slug").innerHTML = items['Contest Slug'];
        document.getElementById("Next").value = items['Next'];
    }
});

const setInfo = (data) => {
    const regex = [
        /.*leetcode.com\/problems\/(.*?)\/.*/,
        /.*leetcode.cn\/problems\/(.*?)\/.*/
    ];
    chrome.tabs.query({currentWindow: true, active: true}, function (tabs) {
        let url = tabs[0].url;
        for (let pattern of regex) {
            if (pattern.test(url)) {
                let title = url.replace(pattern, '$1');
                setTitle(getTitle(data, title));
                break;
            }
        }
    });
};

const getTitle = (data, title) => {
    let info = {};
    for (let i = 0; i < data.length; i++) {
        let problem = data[i];
        if (problem['Title Slug'] === title) {
            info['Rating'] = problem['Rating'];
            info['Contest Slug'] = problem['Contest Slug'];
            info['Problem Index'] = problem['Problem Index'];
            info['Next'] = i + 1;
            break;
        }
    }
    return info
    //dict version
    if (title in data) {
        return data[title];
    }
    return {};
};

window.onload = (async () => {
    const storage = await getData();
    setRange(storage.rate);
    setInfo(storage.data);
    eventTrigger(storage.data);
});



