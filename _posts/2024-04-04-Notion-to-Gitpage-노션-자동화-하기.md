---
layout: post
date: 2024-04-04
title: "Notion to Gitpage 노션 자동화 하기"
tags: [Github Actions, Chirpy, Notion, ]
categories: [Blog, ]
---
## 수정 목표


필자는 반복되는 작업을 자동화 하는 것을 정말 좋아하고 지향합니다.


주로 노션으로 자료를 정리하는 편인데.. 이 자료를 구축해 놓은 기술 블로그에 옮기 자니 노션페이지에서 자료를 내려 받아 포스팅 폴더, 이미지 폴더에 각각 넣어주고.. 작성된 포스팅의 이미지 경로를 재설정 해줘야 하는 아주 아주 ! 불편한 반복되는 작업이 있습니다.
“딸깍”한번으로 노션에서 깃 페이지에 업로드 하는 방법을 찾아 보던 중에 이미 필자 같은 생각을한 훌륭하신 분이 만들어 놓으셨더라고요. 


[LOURCODE 블로그 참고](https://lourcode.kr/posts/Jekyll-%EA%B8%B0%EB%B0%98-Github-Pages%EC%99%80-Notion-Page-%EC%97%B0%EB%8F%99/)


블로그 통해 노션 자동화 구현은 완성하였습니다. 다만 조금 수정해서 사용하려고 합니다.
해당 코드는 버튼을 누를 때마다 github acion 동작하게 되는데 “공개”된 노션페이지의 정보를 _post에 작성 되는 형식입니다. 다만 버튼을 누를 때마다 전체적으로 사진과 포스팅을 지우고 다시 작성하게 설정 되어 있었어요.
나중에 포스팅이 100개, 200개 쌓이다 보면 걸리는 시간이 오래 걸리겠다 싶어서 삭제하지 않고 계속 Append 하는 방식으로 변경 하기로 했습니다. 


## 구조 분석


_scripts/notion-import.js → 노션 페이지에 있는 데이터를 _post에 작성


package.json → 자바스크립트 종속성


.github/workflows/pages-deploy.yml → github action 핸들링


---


## 코드 수정


### _scripts/notion-import.js


전체 로직을 그대로 사용 했고 filter 값만 변경 했습니다.


단순히 Append 목적이기 때문에 공개→발행여부 체크가 false 노션 페이지가 post에 작성 됩니다.


{% raw %}
```javascript
  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      property: "발행여부",
      checkbox: {
        equals: false,
      },
    },
  });
  
```
{% endraw %}


페이지에 있는 동영상을 post 파일로 작성하면 [imge] 하이퍼링크가 걸리고 정상적으로 업로드가 되지 않는다. 
기존 이미지 처리 함수를 이용 해서 비디오 처리하는 코드를 추가 하였습니다.
마크다운에서는 비디오를 업로드 하는 방법이 없다고 하여 찾아보니 html 비디오 태그를 활용 하면  업로드 할 수 있었습니다.


{% raw %}
```javascript
    let video_index = 0;
    let video_edited_md = md.replace(
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
```
{% endraw %}


노션 탬플릿도 동일하게 공개→발행여부로 변경 했습니다.
필자의 경우 미발행 포스팅만 필터 하도록 설정 하였고, 발행 동작 후 해당 체크박스를 체크하여 목록에서 보이지 않게 했습니다.


![0](/assets/img/2024-04-04-Notion-to-Gitpage-노션-자동화-하기.md/0.png)


### .github/workflows/notion-pages-add.yml


필자가 해당 블로그를 구축 하면서 이미 pages-deploy.yml 생성 되었고 해당 기능은 commit 이벤트가 발생하면 동작하게 설정 되어 있는 반면 개발하신 분의 pages-deploy.yml 파일은 설정 기존과는 다른 점이 있어서 notion-pages-add.yml 파일로 별도 관리하기로 했습니다.
해당 코드에서 assets/img/favicons 제외한 모든 폴더와 파일을 삭제 후 _post에 있는 모든 파일을 삭제 하게 되어 있는 부분을 주석 처리 하고 사용 했습니다.


{% raw %}
```yaml
      # - name: Clean Directory
      #   run: |
      #     for file in assets/img/*
      #     do
      #         if [[ $file != "assets/img/favicons" ]]
      #         then
      #             rm -rf "$file"
      #         fi
      #     done
      #     rm -rf _posts/*
```
{% endraw %}


### notion-pages-add.yml 버전 이슈


먼저 개발하신 yml 파일은 23년 6월에 개발 되었음에도 버전 경고가 발생 했습니다.
찾아보니 각 버전이 업데이트 되어 최신 버전으로 찾아 각각 변경 해주었습니다.


![1](/assets/img/2024-04-04-Notion-to-Gitpage-노션-자동화-하기.md/1.png)


## 삽질 후기


처음부터 만들었으면 할 수 있을까? 라는 생각 먼저 들었으나.. 누가 만들어 주신 덕에 좀 더 쉽게 
적용 할 수 있었습니다. 다만 github action 처음 접해 봐서 그런가 변경 하기 쉽지 않았습니다.
action 핸들링 부분에서 삽질은 많이 했네요. 그래도 삽질한 덕에 눈에 들어오기 시작하고 변경도 
처음보다는 쉽게 변경이 가능했습니다. 버전이 수시로 바뀌는지는 모르겠으나 주기적인 모니터링
필요하고 경고창 발생할 때 버전을 변경해야 하는 불편 함이 있습니다.


그래도 노션을 자동화 했다는 것이 더 의미 있다고 생각 합니다.

