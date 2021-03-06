FROM node:current-alpine
WORKDIR /

#copy run script
COPY run.sh /run.sh

#install dependencies
ENV APK_ADD="git bash youtube-dl ffmpeg"
RUN apk add --no-cache ${APK_ADD}
RUN git clone https://github.com/Enriquito/youtube-dl-front
WORKDIR /youtube-dl-front/server
RUN npm install

#setup ports and volumes (volume tbd), startup script
EXPOSE 3000
VOLUME ["/youtube-dl-front/server/videos"]
VOLUME ["/youtube-dl-front/config"]
ENTRYPOINT [ "/run.sh" ]
