const modal = document.getElementById("post-modal");
const openBtn = document.getElementById("create-post-btn");
const closeBtn = document.getElementById("close-modal");
const submitBtn = document.getElementById("submit-post");
const grid = document.querySelector(".post-grid");

let posts = [];

// Open modal
openBtn.onclick = () => modal.classList.remove("hidden");

// Close modal
closeBtn.onclick = () => modal.classList.add("hidden");

// Create post
submitBtn.onclick = () => {
    const fileInput = document.getElementById("post-media");
    const caption = document.getElementById("post-caption").value;
    const category = document.getElementById("post-category").value;

    const file = fileInput.files[0];
    if (!file) return alert("Upload something!");

    const url = URL.createObjectURL(file);

    const post = {
        id: Date.now(),
        url,
        type: file.type.startsWith("video") ? "video" : "image",
        caption,
        likes: 0,
        comments: [],
        category
    };

    posts.unshift(post);
    renderPosts();

    modal.classList.add("hidden");
};

// Render posts
function renderPosts(filter = "art") {
    grid.innerHTML = "";

    posts
        .filter(p => p.category === filter)
        .forEach(post => {
            const div = document.createElement("div");
            div.className = "post-card glass-panel-lite";

            div.innerHTML = `
        ${post.type === "image"
                    ? `<img src="${post.url}">`
                    : `<video src="${post.url}" controls></video>`}

        <p>${post.caption}</p>

        <div class="post-actions">
          <button onclick="likePost(${post.id})">❤️ ${post.likes}</button>
        </div>

        <div class="comment-box">
          <input type="text" placeholder="Add comment..." onkeypress="addComment(event, ${post.id})">
          <div id="comments-${post.id}">
            ${post.comments.map(c => `<p>${c}</p>`).join("")}
          </div>
        </div>
      `;

            grid.appendChild(div);
        });
}

// Like
function likePost(id) {
    const post = posts.find(p => p.id === id);
    post.likes++;
    renderPosts(currentTab);
}

// Comment
function addComment(e, id) {
    if (e.key === "Enter") {
        const post = posts.find(p => p.id === id);
        post.comments.push(e.target.value);
        e.target.value = "";
        renderPosts(currentTab);
    }
}