const { Client } = require("@notionhq/client");
const { NotionToMarkdown } = require("notion-to-md");
const moment = require("moment");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
// or
// import {NotionToMarkdown} from "notion-to-md";

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

function escapeCodeBlock(body) {
  const regex = /```([\s\S]*?)```/g
  return body.replace(regex, function (match, htmlBlock) {
    return "{% raw %}\n```" + htmlBlock + "```\n{% endraw %}"
  })
}

// passing notion client to the option
const n2m = new NotionToMarkdown({ notionClient: notion });

(async () => {
  // ensure directory exists
  const root = "_posts";
  fs.mkdirSync(root, { recursive: true });

  const databaseId = process.env.DATABASE_ID;
  // TODO has_more
  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      property: "발행여부",
      checkbox: {
        equals: false,
      },
    },
  });
  for (const r of response.results) {
    console.log(r)
    const id = r.id;
    // date
    let date = moment(r.created_time).format("YYYY-MM-DD");
    let pdate = r.properties?.["날짜"]?.["date"]?.["start"];
    if (pdate) {
      date = moment(pdate).format("YYYY-MM-DD");
    }
    // title
    let title = id;
    let ptitle = r.properties?.["게시물"]?.["title"];
    if (ptitle?.length > 0) {
      title = ptitle[0]?.["plain_text"];
    }
    // tags
    let tags = [];
    let ptags = r.properties?.["태그"]?.["multi_select"];
    for (const t of ptags) {
      const n = t?.["name"];
      if (n) {
        tags.push(n);
      }
    }
    // categories
    let cats = [];
    let pcats = r.properties?.["카테고리"]?.["multi_select"];
    for (const t of pcats) {
      const n = t?.["name"];
      if (n) {
        cats.push(n);
      }
    }

    // frontmatter
    let fmtags = "";
    let fmcats = "";
    if (tags.length > 0) {
      fmtags += "\ntags: [";
      for (const t of tags) {
        fmtags += t + ", ";
      }
      fmtags += "]";
    }
    if (cats.length > 0) {
      fmcats += "\ncategories: [";
      for (const t of cats) {
        fmcats += t + ", ";
      }
      fmcats += "]";
    }
//     const fm = `---
// layout: post
// date: ${date}
// title: "${title}"${fmtags}${fmcats}
// ---

// `;
    let fm;
  if (cats.length > 0 && cats[0] === "Project") {
    //subtitle
    let ptsubtitleitle = r.properties?.["서브타이틀"]?.["rich_text"];
    if (ptsubtitleitle?.length > 0) {
      ptsubtitleitle = ptsubtitleitle[0]?.["plain_text"];
    }
    //enddate
    let enddate = r.properties?.["종료일"]?.["date"]?.["start"];
    if (enddate) {
      enddate = moment(enddate).format("YYYY-MM-DD");
    }
    fm = `---
layout: post
date: ${date}
title: "${title}"${fmtags}${fmcats}
subtitle: ${ptsubtitleitle}
enddate : ${enddate}
comments: false
---`;
  } else {
      fm = `---
layout: post
date: ${date}
title: "${title}"${fmtags}${fmcats}
---`;
  }
    const mdblocks = await n2m.pageToMarkdown(id);
    let md = n2m.toMarkdownString(mdblocks)["parent"];
    md = escapeCodeBlock(md);

    const ftitle = `${date}-${title.replaceAll(" ", "-")}.md`;

    let index = 0;
    let edited_md = md.replace(
      /!\[(.*?)\]\((.*?)\)/g,
      function (match, p1, p2, p3) {
        const dirname = path.join("assets/img", ftitle);
        if (!fs.existsSync(dirname)) {
          fs.mkdirSync(dirname, { recursive: true });
        }
        const filename = path.join(dirname, `${index}.png`);

        axios({
          method: "get",
          url: p2,
          responseType: "stream",
        })
          .then(function (response) {
            let file = fs.createWriteStream(`${filename}`);
            response.data.pipe(file);
          })
          .catch(function (error) {
            console.log(error);
          });

        let res;
        if (p1 === "") res = "";
        else res = `_${p1}_`;

        return `![${index++}](/${filename})${res}`;
      }
    );
    let video_index = 0;
    let video_edited_md = edited_md.replace(
      /\[image]\((.*?)\)/g,
      function (match, p1) {
        const dirname = path.join("assets/video", ftitle);
        if (!fs.existsSync(dirname)) {
          fs.mkdirSync(dirname, { recursive: true });
        }
        const filename = path.join(dirname, `${video_index}.mp4`);
        axios({
          method: "get",
          url: p1,
          responseType: "stream",
        })
          .then(function (response) {
            let file = fs.createWriteStream(`${filename}`);
            response.data.pipe(file);
          })
          .catch(function (error) {
            console.log(error);
          });
        video_index++


        return `<video width="100%" controls>
          <source src="/${filename}" type="video/mp4">
        </video>`;
        
      }
    );
    //writing to file
    fs.writeFile(path.join(root, ftitle), fm + video_edited_md, (err) => {
      if (err) {
        console.log(err);
      }
    });
  }
})();
