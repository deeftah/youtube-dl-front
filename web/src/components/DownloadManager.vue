<template>
    <div id="download-manager" :class="windowClass">
        <div class="d-flex justify-content-between">
            <h5 style="cursor:pointer;">Downloads</h5>
            <img @click="deleteList" class="icon" style="height: 20px !important;" src="@/assets/icons/trash.svg" alt="Download" />
        </div>
        <div>
            <ul v-if="isDownloading">
                <li>
                    <DownloadItem :showProgress="true" :title="item.title" :progressValue="item.downloadStatus" />
                </li>
            </ul>
        </div>
        <div>
            <ul v-if="queueItems.length > 0">
                <li v-for="(item, index) in queueItems" :key="item.id">
                    <DownloadItem v-if="index <= 10" :showProgress="false" :title="item.title" :progressValue="item.downloadStatus" />
                </li>
            </ul>
        </div>
    </div>
</template>
<script>
import DownloadItem from '@/components/DownloadItem.vue'

export default {
    name: "DownloadManager",
    mounted() {
        this.sockets.subscribe('downloadStatus', (data) => {
            this.data = data.downloads;
            this.checkIfFinished();

            if(data === null)
                return;

            data.downloads.forEach(el => {
                if(el.status === 'downloading'){
                    this.isDownloading = true;
                    this.item = el;
                }
            });
        });

        this.$socket.emit('downloadStatus');
    },
    data(){
        return({
            data: [],
            fetchInterval: null,
            isDownloading: false,
            item: null,
            windowClass: ""
        });
    },
    methods:{
        deleteList(){
            this.$socket.emit('DeleteDownloads');

            this.data.forEach((el, index) => {
                if(el.status !== 'downloading' || el.status !== 'queued'){
                    this.data.splice(index, 1);
                }
            });
        },
        checkIfFinished(){
            if(this.item === null)
                return;

            this.data.forEach(el => {
                if(this.item.id === el.id && el.status === 'finished'){
                    this.isDownloading = false;
                    this.$store.commit('isDownloading', false);
                }
            });
        }
    },
    watch:{
        open(newVal){
            if(newVal){
                this.windowClass = "close-manager"
            }
            else{
                this.windowClass = "open-manager";
                this.$socket.emit('downloadStatus');
            }
        }
    },
    props:{
        open: Boolean
    },
    components:{
        DownloadItem
    },
    computed:{
        queueItems(){
            const q = [];

            this.data.forEach(el => {
                if(el.status === 'queued'){
                    q.push(el);
                }
            });

            return q;
        },
        finishedItems(){
            const q = [];

            this.data.forEach(el => {
                if(el.status === 'finished'){
                    q.push(el);
                }
            });

            return q;
        }
    }
}
</script>
<style scoped>
@keyframes close{
    0%{
        left: 10px;
    }
    50%{
        left: 35px;
    }
    100%{
        left: -1000;
    }
}
@keyframes openm{
    0%{
        left: -1000;
    }
    50%{
        left: 35px;
    }
    100%{
        left: 10px;
        height: auto;
    }
}
.close-manager{
    animation: close forwards 0.5s;
}
.open-manager{
    animation: openm forwards 0.5s;
}
.icon
{
    height: 25px !important;
    margin-right: 5px;
    cursor: pointer;
}
#download-manager
{
    transition: all 0.5s;
    -webkit-transition: all 0.5s;
    overflow: hidden;
    position: fixed;
    top: 10px;
    left: -1000px;
    width: 230px;
    height: 45px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    background: #FFF;
    padding: 10px;
    border-radius: 10px;
    z-index: 990;

}
#download-manager:hover{
    width: 300px;
}
#download-manager progress
{
    border-radius: 0;
}
#download-manager ul{
    margin: 0;
    padding: 0 10px;
}
#download-manager ul li{
    list-style-type: none;
    padding: 10px 0;
}
</style>